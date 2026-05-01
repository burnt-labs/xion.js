/**
 * ⚠️ TO BE PROMOTED — `createAbstraxionRuntime` and the helpers it returns
 * (`createReadClient`, `createDirectSigningClient`, `manageAuthenticators`,
 * etc.) are framework-agnostic and belong in `@burnt-labs/abstraxion-js`
 * itself. They live here for now so the demo PR stays self-contained;
 * tracked as Phase 9c in `.docs/tasks/abstraxion_package_restructure.md`.
 *
 * Once promoted:
 *   - `abstraxion-react`'s `AbstraxionProvider` + hooks consume the same
 *     runtime, removing duplicated controller-narrowing logic.
 *   - This file shrinks to just the Svelte binding (`createAbstraxionStore`).
 *
 * --
 *
 * Reusable wrapper around `@burnt-labs/abstraxion-js` for non-React stacks.
 *
 * Two layers:
 *
 *   1. `createAbstraxionRuntime(config)` — framework-agnostic. Returns a
 *      controller, a `subscribe(cb)` you can wire into any reactivity system
 *      (Svelte stores, Vue refs, Solid signals, RxJS, plain callbacks…), plus
 *      ready-to-call helpers for direct signing and manage-authenticators.
 *
 *   2. `createAbstraxionStore(config)` — Svelte binding. Mirrors the runtime
 *      state into a Svelte `writable`, exposes a `derived` shape that matches
 *      what `useAbstraxionAccount()` returns in React.
 *
 * The runtime is the part you copy when porting to Vue/Solid/etc. — only the
 * `subscribe → reactive` step changes per framework.
 */
import { writable, derived, type Readable } from "svelte/store";
import {
  AAClient,
  AccountStateGuards,
  AUTHENTICATOR_TYPE,
  BrowserRedirectStrategy,
  BrowserStorageStrategy,
  CosmWasmClient,
  GasPrice,
  IframeController,
  PopupController,
  RedirectController,
  RequireSigningClient,
  SignerController,
  createController,
  createSignerFromSigningFunction,
  normalizeAbstraxionConfig,
  type AbstraxionConfig,
  type AccountState,
  type AuthenticatorType,
  type Controller,
  type NormalizedAbstraxionConfig,
  type RedirectStrategy,
  type SigningClient,
  type StorageStrategy,
  type Unsubscribe,
} from "@burnt-labs/abstraxion-js";

// ─── Framework-agnostic runtime ────────────────────────────────────────────

export interface AbstraxionRuntimeOptions {
  /**
   * Override the default browser strategies. Useful for tests, SSR (provide
   * no-op strategies), or non-browser hosts (Tauri, Electron, etc.).
   */
  strategies?: {
    storageStrategy?: StorageStrategy;
    redirectStrategy?: RedirectStrategy;
  };
  /**
   * If `false`, the runtime won't call `controller.initialize()` for you —
   * subscribe first, then call `runtime.initialize()` yourself. Defaults to
   * `true`, which matches `<AbstraxionProvider>`'s React behavior.
   */
  autoInitialize?: boolean;
}

export interface AbstraxionRuntime {
  /** The underlying controller — escape hatch for advanced flows (iframe.setContainerElement, etc.). */
  controller: Controller;
  /** Normalized config (defaults filled in from chainId). */
  config: NormalizedAbstraxionConfig;
  /** Current state snapshot. */
  getState(): AccountState;
  /** Subscribe to state changes. Returns an unsubscribe. */
  subscribe(cb: (state: AccountState) => void): Unsubscribe;
  /** Restore session, detect redirect callback, etc. Idempotent-ish — call once. */
  initialize(): Promise<void>;
  /** Start the auth flow. */
  login(): Promise<void>;
  /** Disconnect and clear stored grants. */
  logout(): Promise<void>;
  /** True for popup, redirect, embedded modes. */
  isManageAuthSupported: boolean;
  /** Open the manage-authenticators flow. Throws when not supported. */
  manageAuthenticators(granterAddress: string): Promise<void>;
  /**
   * Read-only `CosmWasmClient` connected to the configured RPC. Same thing
   * `useAbstraxionClient()` returns in React — internally just calls
   * `CosmWasmClient.connect(rpcUrl)`. Cache the resolved client; don't call
   * this on every render.
   */
  createReadClient(): Promise<CosmWasmClient>;
  /**
   * Build a direct-signing client (`requireAuth: true` equivalent). Resolves
   * to:
   *  - `RequireSigningClient` for popup / redirect / embedded modes (the
   *    dashboard mediates approval over the active transport).
   *  - `AAClient` for signer mode (the user-supplied signer signs each tx
   *    directly — no dashboard involvement).
   *
   * Throws if called in signer mode before login (because `AAClient`
   * construction needs the connected `granterAddress` and the
   * `connectionInfo.signMessage` exposed by `SignerController`).
   */
  createDirectSigningClient(): Promise<SigningClient | undefined>;
}

export function createAbstraxionRuntime(
  config: AbstraxionConfig,
  options: AbstraxionRuntimeOptions = {},
): AbstraxionRuntime {
  const normalized = normalizeAbstraxionConfig(config);

  const controller = createController(normalized, {
    storageStrategy:
      options.strategies?.storageStrategy ?? new BrowserStorageStrategy(),
    redirectStrategy:
      options.strategies?.redirectStrategy ?? new BrowserRedirectStrategy(),
  });

  const isManageAuthSupported =
    controller instanceof PopupController ||
    controller instanceof IframeController ||
    controller instanceof RedirectController;

  let initialized = false;

  const runtime: AbstraxionRuntime = {
    controller,
    config: normalized,
    getState: () => controller.getState(),
    subscribe: (cb) => controller.subscribe(cb),
    initialize: async () => {
      if (initialized) return;
      initialized = true;
      await controller.initialize();
    },
    login: () => controller.connect(),
    logout: () => controller.disconnect(),
    isManageAuthSupported,
    manageAuthenticators: async (granterAddress) => {
      if (
        controller instanceof PopupController ||
        controller instanceof IframeController ||
        controller instanceof RedirectController
      ) {
        return controller.promptManageAuthenticators(granterAddress);
      }
      throw new Error(
        "manageAuthenticators is only supported in popup, redirect, and embedded modes.",
      );
    },
    createReadClient: () => CosmWasmClient.connect(normalized.rpcUrl),
    createDirectSigningClient: async () => {
      // Popup / redirect / embedded: thin wrapper over the controller's
      // existing `promptSignAndBroadcast` / `signAndBroadcastWithMetaAccount`
      // method. Construction is sync; we await for API uniformity only.
      if (controller instanceof PopupController) {
        return new RequireSigningClient(
          controller.promptSignAndBroadcast.bind(controller),
          normalized.rpcUrl,
        );
      }
      if (controller instanceof RedirectController) {
        return new RequireSigningClient(
          controller.promptSignAndBroadcast.bind(controller),
          normalized.rpcUrl,
        );
      }
      if (controller instanceof IframeController) {
        return new RequireSigningClient(
          controller.signAndBroadcastWithMetaAccount.bind(controller),
          normalized.rpcUrl,
        );
      }

      // Signer mode: build an AAClient from the connection info. Mirrors what
      // useAbstraxionSigningClient does in @burnt-labs/abstraxion-react —
      // this is the wiring you'd otherwise have to copy-paste.
      if (controller instanceof SignerController) {
        const state = controller.getState();
        if (!AccountStateGuards.isConnected(state)) {
          throw new Error(
            "createDirectSigningClient(): user is not connected. Call login() first.",
          );
        }
        const connectionInfo = controller.getConnectionInfo?.();
        if (!connectionInfo) {
          throw new Error(
            "createDirectSigningClient(): SignerController has no connectionInfo — login may have failed.",
          );
        }
        const authenticatorType = connectionInfo.metadata
          ?.authenticatorType as AuthenticatorType | undefined;
        const authenticatorIndex =
          (connectionInfo.metadata?.authenticatorIndex as number | undefined) ??
          0;
        if (
          !authenticatorType ||
          !Object.values(AUTHENTICATOR_TYPE).includes(authenticatorType)
        ) {
          throw new Error(
            `createDirectSigningClient(): connectionInfo.metadata.authenticatorType is missing or invalid (got: ${String(authenticatorType)}).`,
          );
        }
        const signer = createSignerFromSigningFunction({
          smartAccountAddress: state.account.granterAddress,
          authenticatorIndex,
          authenticatorType,
          signMessage: connectionInfo.signMessage,
        });
        return AAClient.connectWithSigner(normalized.rpcUrl, signer, {
          gasPrice: GasPrice.fromString(normalized.gasPrice),
        });
      }

      return undefined;
    },
  };

  if (options.autoInitialize !== false) {
    runtime.initialize().catch((error) => {
      console.error("[abstraxion-runtime] initialize() failed:", error);
    });
  }

  return runtime;
}

// ─── Svelte binding ────────────────────────────────────────────────────────

export interface AbstraxionStoreValue {
  state: AccountState;
  isInitializing: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isDisconnected: boolean;
  isError: boolean;
  error: string;
  granterAddress: string;
  signingClient: SigningClient | undefined;
}

function deriveValue(state: AccountState): AbstraxionStoreValue {
  const isConnected = AccountStateGuards.isConnected(state);
  return {
    state,
    isInitializing: AccountStateGuards.isInitializing(state),
    isConnecting:
      AccountStateGuards.isConnecting(state) ||
      AccountStateGuards.isConfiguringPermissions(state),
    isConnected,
    isDisconnected: AccountStateGuards.isDisconnected(state),
    isError: AccountStateGuards.isError(state),
    error: AccountStateGuards.isError(state) ? state.error : "",
    granterAddress: isConnected ? state.account.granterAddress : "",
    signingClient: isConnected ? state.signingClient : undefined,
  };
}

export interface AbstraxionStore {
  /** Reactive state — bind with `$store` in components. */
  store: Readable<AbstraxionStoreValue>;
  /** The framework-agnostic runtime — use this for Vue/Solid/vanilla ports. */
  runtime: AbstraxionRuntime;
  login(): Promise<void>;
  logout(): Promise<void>;
  manageAuthenticators(granterAddress: string): Promise<void>;
  isManageAuthSupported: boolean;
  createReadClient(): Promise<CosmWasmClient>;
  createDirectSigningClient(): Promise<SigningClient | undefined>;
}

// Singleton at module scope — controllers are heavy and re-creating them
// breaks redirect callback detection if the Provider remounts.
let runtimeSingleton: AbstraxionRuntime | undefined;

export function createAbstraxionStore(
  config: AbstraxionConfig,
  options?: AbstraxionRuntimeOptions,
): AbstraxionStore {
  if (!runtimeSingleton) {
    // autoInitialize is delayed so we can subscribe before the first state
    // dispatch — otherwise a fast `INITIALIZE → CONNECTED` transition could be
    // missed by the writable store.
    runtimeSingleton = createAbstraxionRuntime(config, {
      ...options,
      autoInitialize: false,
    });
  }
  const runtime = runtimeSingleton;

  const stateStore = writable<AccountState>(runtime.getState());
  runtime.subscribe((next) => stateStore.set(next));
  runtime.initialize();

  const store = derived(stateStore, deriveValue);

  return {
    store,
    runtime,
    login: runtime.login,
    logout: runtime.logout,
    manageAuthenticators: runtime.manageAuthenticators,
    isManageAuthSupported: runtime.isManageAuthSupported,
    createReadClient: runtime.createReadClient,
    createDirectSigningClient: runtime.createDirectSigningClient,
  };
}
