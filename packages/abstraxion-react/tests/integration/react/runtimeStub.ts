/**
 * Shared runtime stub for React-glue tests.
 *
 * The React layer is "a thin wrapper around `@burnt-labs/abstraxion-js`'s
 * runtime" (per Phase 9c). To keep these tests honest about that boundary, we
 * stub `createAbstraxionRuntime` so the React tests assert glue behavior
 * (context wiring, useSyncExternalStore re-renders, hook shape, effect
 * lifecycles) instead of re-testing the runtime itself.
 *
 * Runtime contract is covered by
 * `packages/abstraxion-js/src/__tests__/runtime.test.ts`.
 */

import { vi } from "vitest";
import type {
  AbstraxionRuntime,
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
} from "@burnt-labs/abstraxion-js";
import type { AccountState } from "@burnt-labs/account-management";

export interface StubRuntimeOverrides {
  authMode?: AbstraxionRuntime["authMode"];
  state?: AccountState;
  approvalState?: boolean;
  isManageAuthSupported?: boolean;
  manageAuthUnsupportedReason?: string;
  controller?: unknown;
  config?: Partial<NormalizedAbstraxionConfig>;
  createReadClient?: AbstraxionRuntime["createReadClient"];
  createDirectSigningClient?: AbstraxionRuntime["createDirectSigningClient"];
}

export interface StubRuntime extends AbstraxionRuntime {
  __setState(state: AccountState): void;
  __setApproval(value: boolean): void;
  __subscribers: Set<(s: AccountState) => void>;
  __approvalSubscribers: Set<(v: boolean) => void>;
  initialize: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  updateGetSignerConfig: ReturnType<typeof vi.fn>;
  manageAuthenticators: ReturnType<typeof vi.fn>;
  createReadClient: ReturnType<typeof vi.fn>;
  createDirectSigningClient: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  subscribeApproval: ReturnType<typeof vi.fn>;
}

export const idleState = {
  status: "idle",
} as unknown as AccountState;

export const connectedState = (
  granterAddress = "xion1granter",
): AccountState =>
  ({
    status: "connected",
    account: {
      granterAddress,
      keypair: { signArb: vi.fn() },
    },
    signingClient: { kind: "grantee-client" },
  }) as unknown as AccountState;

export function createStubRuntime(
  config: AbstraxionConfig,
  overrides: StubRuntimeOverrides = {},
): StubRuntime {
  const subscribers = new Set<(s: AccountState) => void>();
  const approvalSubscribers = new Set<(v: boolean) => void>();
  let state: AccountState = overrides.state ?? idleState;
  let approval = overrides.approvalState ?? false;

  const normalized: NormalizedAbstraxionConfig = {
    chainId: config.chainId,
    rpcUrl: config.rpcUrl ?? "https://rpc.test/",
    restUrl: config.restUrl ?? "https://rest.test/",
    gasPrice: config.gasPrice ?? "0.001uxion",
    treasury: config.treasury,
    authentication: config.authentication,
    ...overrides.config,
  } as NormalizedAbstraxionConfig;

  const runtime = {
    controller: overrides.controller,
    config: normalized,
    authMode: overrides.authMode ?? "redirect",
    isManageAuthSupported: overrides.isManageAuthSupported ?? true,
    manageAuthUnsupportedReason: overrides.manageAuthUnsupportedReason,
    getState: vi.fn(() => state),
    subscribe: vi.fn((cb: (s: AccountState) => void) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    }),
    subscribeApproval: vi.fn((cb: (v: boolean) => void) => {
      approvalSubscribers.add(cb);
      return () => {
        approvalSubscribers.delete(cb);
      };
    }),
    getApprovalState: vi.fn(() => approval),
    initialize: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    manageAuthenticators: vi.fn().mockResolvedValue(undefined),
    createReadClient:
      overrides.createReadClient ??
      vi.fn().mockResolvedValue({ kind: "cosmwasm-client" }),
    createDirectSigningClient:
      overrides.createDirectSigningClient ??
      vi.fn().mockResolvedValue({ kind: "direct-signing-client" }),
    updateGetSignerConfig: vi.fn(),
    destroy: vi.fn(),
    __subscribers: subscribers,
    __approvalSubscribers: approvalSubscribers,
    __setState(next: AccountState) {
      state = next;
      subscribers.forEach((cb) => cb(state));
    },
    __setApproval(value: boolean) {
      approval = value;
      approvalSubscribers.forEach((cb) => cb(value));
    },
  } as unknown as StubRuntime;

  return runtime;
}
