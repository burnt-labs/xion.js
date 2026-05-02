/**
 * Framework-agnostic runtime for `@burnt-labs/abstraxion-js`.
 *
 * `createAbstraxionRuntime(config, options)` is the single entry point every
 * framework wrapper builds on. It owns:
 *   - controller construction (singleton-friendly via `useRef`-style consumers)
 *   - state subscription (`subscribe` + `getState`)
 *   - login / logout
 *   - read-client / direct-signing-client construction (covers all four modes)
 *   - manage-authenticators dispatch
 *   - iframe approval-state subscription (web embedded mode only)
 *   - dynamic `getSignerConfig` updates (signer mode only)
 *
 * Frameworks (React/Svelte/Vue/Solid/vanilla) only need to mirror
 * `runtime.subscribe(getState)` into their own reactivity primitive.
 */

import {
  AAClient,
  createSignerFromSigningFunction,
  GasPrice,
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import {
  AccountStateGuards,
  type AccountState,
} from "@burnt-labs/account-management";
import type {
  RedirectStrategy,
  StorageStrategy,
} from "@burnt-labs/abstraxion-core";

import {
  createController,
  IframeController,
  PopupController,
  RedirectController,
  SignerController,
  RequireSigningClient,
  type Controller,
  type Unsubscribe,
} from "./controllers";
import { BrowserIframeTransportStrategy } from "./strategies/BrowserIframeTransportStrategy";
import { BrowserRedirectStrategy } from "./strategies/BrowserRedirectStrategy";
import { BrowserStorageStrategy } from "./strategies/BrowserStorageStrategy";
import type { IframeTransportStrategy } from "./strategies/IframeTransportStrategy";
import type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  SigningClient,
} from "./types";
import { normalizeAbstraxionConfig } from "./utils/normalizeAbstraxionConfig";

export interface AbstraxionRuntimeOptions {
  /**
   * Override the default browser strategies. React Native (and SSR / Tauri /
   * Electron / tests) supplies its own here.
   */
  strategies?: {
    storageStrategy?: StorageStrategy;
    redirectStrategy?: RedirectStrategy;
    iframeTransportStrategy?: IframeTransportStrategy;
  };
  /**
   * If `false`, the runtime won't call `controller.initialize()` for you —
   * subscribe first, then call `runtime.initialize()` yourself. Defaults to
   * `true`, which matches `<AbstraxionProvider>`'s React behavior.
   */
  autoInitialize?: boolean;
}

export interface AbstraxionRuntime {
  /** The underlying controller — escape hatch for advanced flows. */
  controller: Controller;
  /** Normalized config (defaults filled in from chainId). */
  config: NormalizedAbstraxionConfig;
  /** Active auth mode, derived from the controller instance. */
  authMode: "signer" | "redirect" | "embedded" | "popup";
  /** Current state snapshot. */
  getState(): AccountState;
  /** Subscribe to state changes. Returns an unsubscribe. */
  subscribe(cb: (state: AccountState) => void): Unsubscribe;
  /**
   * Subscribe to "awaitingApproval" changes — only meaningful in embedded mode.
   * In other modes the callback is registered but never fires.
   */
  subscribeApproval(cb: (value: boolean) => void): Unsubscribe;
  /** Current approval-pending state. Always `false` outside embedded mode. */
  getApprovalState(): boolean;
  /** Restore session, detect redirect callback, etc. Idempotent — call once. */
  initialize(): Promise<void>;
  /** Start the auth flow. */
  login(): Promise<void>;
  /** Disconnect and clear stored grants. */
  logout(): Promise<void>;
  /** True for popup, redirect, embedded modes. */
  isManageAuthSupported: boolean;
  /**
   * Human-readable reason for `isManageAuthSupported === false`. `undefined`
   * when manage-auth is supported. Hooks surface this to consumers so disabled
   * UI can explain itself.
   */
  manageAuthUnsupportedReason: string | undefined;
  /** Open the manage-authenticators flow. Throws when not supported. */
  manageAuthenticators(granterAddress: string): Promise<void>;
  /**
   * Read-only `CosmWasmClient` connected to the configured RPC. Construct
   * this once and cache it; do not call on every render.
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
   * Throws if called in signer mode before login.
   */
  createDirectSigningClient(): Promise<SigningClient | undefined>;
  /**
   * Update the dynamic `getSignerConfig` function used in signer mode.
   * Common pattern: external auth providers (Turnkey/Privy) become ready
   * after the initial render and need to swap in a new authenticated function.
   *
   * No-op outside signer mode.
   */
  updateGetSignerConfig(
    fn: NonNullable<
      import("./types").SignerAuthentication["getSignerConfig"]
    >,
  ): void;
  /** Tear down listeners + iframe (delegates to `controller.destroy()`). */
  destroy(): void;
}

function deriveAuthMode(
  controller: Controller,
): "signer" | "redirect" | "embedded" | "popup" {
  if (controller instanceof PopupController) return "popup";
  if (controller instanceof RedirectController) return "redirect";
  if (controller instanceof IframeController) return "embedded";
  return "signer";
}

export function createAbstraxionRuntime(
  config: AbstraxionConfig,
  options: AbstraxionRuntimeOptions = {},
): AbstraxionRuntime {
  const normalized = normalizeAbstraxionConfig(config);

  const storageStrategy =
    options.strategies?.storageStrategy ?? new BrowserStorageStrategy();
  const redirectStrategy =
    options.strategies?.redirectStrategy ?? new BrowserRedirectStrategy();

  // Iframe transport: only needed for embedded mode. Default to the browser
  // transport on the web; React Native consumers always supply their own
  // (RNWebViewIframeTransport from @burnt-labs/abstraxion-react-native).
  const isEmbeddedMode = normalized.authentication?.type === "embedded";
  const iframeTransportStrategy = isEmbeddedMode
    ? (options.strategies?.iframeTransportStrategy ??
      new BrowserIframeTransportStrategy())
    : options.strategies?.iframeTransportStrategy;

  const controller = createController(normalized, {
    storageStrategy,
    redirectStrategy,
    iframeTransportStrategy,
  });

  const authMode = deriveAuthMode(controller);
  const isManageAuthSupported =
    controller instanceof PopupController ||
    controller instanceof IframeController ||
    controller instanceof RedirectController;
  const manageAuthUnsupportedReason = isManageAuthSupported
    ? undefined
    : `Manage authenticators is not supported in ${authMode} mode. ` +
      `Use popup, redirect, or embedded authentication to add or remove authenticators.`;

  let initializePromise: Promise<void> | null = null;
  let readClientPromise: Promise<CosmWasmClient> | null = null;

  // Dev-mode sanity check: warn when grant-based dashboard modes are configured
  // without any grants. Lifted from the React provider so every framework
  // wrapper gets the same nudge.
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
    const { treasury, contracts, stake, bank } = normalized;
    const hasGrants =
      !!treasury ||
      (contracts && contracts.length > 0) ||
      !!stake ||
      (bank && bank.length > 0);
    const isDashboardMode =
      authMode === "popup" ||
      authMode === "redirect" ||
      authMode === "embedded";
    if (!hasGrants && isDashboardMode) {
      console.warn(
        "[abstraxion-runtime] No grants configured (treasury, contracts, stake, or bank). " +
          "In popup/redirect/embedded modes the user will authenticate and get a session key, " +
          "but no on-chain permissions will be granted to it. " +
          "This is intentional if you are using requireAuth (direct signing), where the user " +
          "signs transactions directly from their meta-account rather than via a session key. " +
          "If you expected grant-based signing, add a `treasury` address or legacy grant config.",
      );
    }
  }

  const runtime: AbstraxionRuntime = {
    controller,
    config: normalized,
    authMode,
    getState: () => controller.getState(),
    subscribe: (cb) => controller.subscribe(cb),
    subscribeApproval: (cb) => {
      if (controller instanceof IframeController) {
        return controller.subscribeApproval(cb);
      }
      return () => {};
    },
    getApprovalState: () => {
      if (controller instanceof IframeController) {
        return controller.awaitingApproval;
      }
      return false;
    },
    initialize: () => {
      if (!initializePromise) {
        initializePromise = controller.initialize();
      }
      return initializePromise;
    },
    login: () => controller.connect(),
    logout: () => controller.disconnect(),
    isManageAuthSupported,
    manageAuthUnsupportedReason,
    manageAuthenticators: async (granterAddress) => {
      if (
        controller instanceof PopupController ||
        controller instanceof IframeController ||
        controller instanceof RedirectController
      ) {
        return controller.promptManageAuthenticators(granterAddress);
      }
      throw new Error(
        manageAuthUnsupportedReason ??
          "manageAuthenticators is only supported in popup, redirect, and embedded modes.",
      );
    },
    createReadClient: () => {
      if (!readClientPromise) {
        readClientPromise = CosmWasmClient.connect(normalized.rpcUrl).catch(
          (error) => {
            // Reset on failure so the next call retries instead of returning
            // a permanently rejected cached promise.
            readClientPromise = null;
            throw error;
          },
        );
      }
      return readClientPromise;
    },
    createDirectSigningClient: async () => {
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
          (connectionInfo.metadata?.authenticatorIndex as
            | number
            | undefined) ?? 0;
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
    updateGetSignerConfig: (fn) => {
      if (controller instanceof SignerController) {
        controller.updateGetSignerConfig(fn);
      }
    },
    destroy: () => {
      readClientPromise = null;
      controller.destroy();
    },
  };

  if (options.autoInitialize !== false) {
    runtime.initialize().catch((error) => {
      console.error("[abstraxion-runtime] initialize() failed:", error);
    });
  }

  return runtime;
}
