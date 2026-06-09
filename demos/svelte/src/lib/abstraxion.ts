/**
 * Svelte binding for `@burnt-labs/abstraxion-js`.
 *
 * The framework-agnostic runtime (`createAbstraxionRuntime`) lives in
 * `@burnt-labs/abstraxion-js`. This file is the
 * Svelte binding: a `writable` mirror of `runtime.subscribe` plus a
 * `derived` shape that matches what `useAbstraxionAccount()` returns in React.
 *
 * Port to Vue/Solid/vanilla by replacing `writable`/`derived` with the
 * framework's reactivity primitive — the runtime stays the same.
 */
import { writable, derived, type Readable } from "svelte/store";
import {
  AccountStateGuards,
  CosmWasmClient,
  createAbstraxionRuntime,
  type AbstraxionConfig,
  type AbstraxionRuntime,
  type AbstraxionRuntimeOptions,
  type AccountState,
  type SigningClient,
} from "@burnt-labs/abstraxion-js";

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
    login: () => runtime.login(),
    logout: () => runtime.logout(),
    manageAuthenticators: (granterAddress: string) =>
      runtime.manageAuthenticators(granterAddress),
    isManageAuthSupported: runtime.isManageAuthSupported,
    createReadClient: () => runtime.createReadClient(),
    createDirectSigningClient: () => runtime.createDirectSigningClient(),
  };
}
