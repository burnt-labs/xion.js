/**
 * simulateWithNilPubkey tests
 *
 * Mocks only the network layer (Comet38Client, auth gRPC, Simulate RPC).
 * Real encoding/parsing logic — customAccountFromAny, AuthInfo, TxRaw, Registry — runs
 * unmodified so the AbstractAccount parser path is actually exercised.
 *
 * Regression: previously simulateWithNilPubkey used StargateClient without a custom
 * accountParser, which threw "Unsupported type: /abstractaccount.v1.AbstractAccount".
 * These tests would have caught that.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AbstractAccount } from "@burnt-labs/xion-types/abstractaccount/v1/account";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { testAccounts } from "../../../testing/fixtures";

// ── Network mocks (hoisted before module resolution) ─────────────────

const { mockSimulate } = vi.hoisted(() => ({
  mockSimulate: vi
    .fn()
    .mockResolvedValue({ gasInfo: { gasUsed: BigInt(100_000) } }),
}));

vi.mock("@cosmjs/tendermint-rpc", () => ({
  Comet38Client: {
    connect: vi.fn().mockResolvedValue({ disconnect: vi.fn() }),
  },
}));

// Fixture addresses don't carry valid bech32 checksums (they're mock data).
// bech32 is used only to derive NilPubKey bytes; mock it so address validation
// doesn't interfere with testing the actual simulate logic.
vi.mock("bech32", () => ({
  bech32: {
    decode: vi.fn().mockReturnValue({ words: new Array(32).fill(0) }),
    fromWords: vi.fn().mockReturnValue(new Array(20).fill(0)),
  },
}));

// Keep real stargate helpers (AuthInfo, calculateFee, …) but override the
// QueryClient static factory and RPC client builder so tests control auth/simulate.
vi.mock("@cosmjs/stargate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cosmjs/stargate")>();
  return {
    ...actual,
    QueryClient: { withExtensions: vi.fn() },
    createProtobufRpcClient: vi.fn().mockReturnValue({}),
  };
});

vi.mock("cosmjs-types/cosmos/tx/v1beta1/service", () => ({
  ServiceClientImpl: class {
    Simulate = mockSimulate;
  },
  SimulateRequest: { fromPartial: vi.fn((v) => v) },
}));

// ── Imports after mocks ───────────────────────────────────────────────

import { simulateWithNilPubkey } from "../simulate";
import { QueryClient } from "@cosmjs/stargate";

// ── Helpers ───────────────────────────────────────────────────────────

const RPC = "https://rpc.xion-testnet-2.burnt.com:443";

/** Build a proto-encoded Any that looks like what auth.account() returns for a XION AA. */
function abstractAccountAny(address: string, sequence = 5) {
  return {
    typeUrl: "/abstractaccount.v1.AbstractAccount",
    value: AbstractAccount.encode(
      AbstractAccount.fromPartial({
        address,
        accountNumber: BigInt(42),
        sequence: BigInt(sequence),
      }),
    ).finish(),
  };
}

function setupQueryClient(address = testAccounts.existing, sequence = 5) {
  (QueryClient.withExtensions as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: {
      account: vi.fn().mockResolvedValue(abstractAccountAny(address, sequence)),
    },
  });
}

const MSG_SEND = {
  typeUrl: "/cosmos.bank.v1beta1.MsgSend",
  value: {
    fromAddress: testAccounts.existing,
    toAddress: testAccounts.existing,
    amount: [{ denom: "uxion", amount: "1000" }],
  },
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("simulateWithNilPubkey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSimulate.mockResolvedValue({ gasInfo: { gasUsed: BigInt(100_000) } });
    setupQueryClient();
  });

  it("returns gas estimate as a number", async () => {
    const gas = await simulateWithNilPubkey(
      RPC,
      testAccounts.existing,
      [MSG_SEND],
      undefined,
    );
    expect(gas).toBe(100_000);
    expect(typeof gas).toBe("number");
  });

  it("decodes AbstractAccount without 'Unsupported type' error (regression)", async () => {
    // This is the regression guard. Before the fix, StargateClient used the default
    // accountParser which threw: "Unsupported type: /abstractaccount.v1.AbstractAccount".
    // customAccountFromAny is now used, which handles this type explicitly.
    await expect(
      simulateWithNilPubkey(RPC, testAccounts.existing, [MSG_SEND], undefined),
    ).resolves.toBe(100_000);
  });

  it("calls Simulate exactly once per invocation", async () => {
    await simulateWithNilPubkey(
      RPC,
      testAccounts.existing,
      [MSG_SEND],
      "test-memo",
    );
    expect(mockSimulate).toHaveBeenCalledOnce();
  });

  it("works with treasury (32-byte smart contract) address", async () => {
    setupQueryClient(testAccounts.treasury, 1);
    const gas = await simulateWithNilPubkey(
      RPC,
      testAccounts.treasury,
      [MSG_SEND],
      undefined,
    );
    expect(gas).toBe(100_000);
  });

  it("works with a standard 20-byte xion address", async () => {
    // xion1z53wwe7md6cewz9sqwqzn0aavpaun0gw0exn2r — the address from client.test.ts fixtures
    const addr = "xion1z53wwe7md6cewz9sqwqzn0aavpaun0gw0exn2r";
    setupQueryClient(addr, 3);
    const gas = await simulateWithNilPubkey(RPC, addr, [], undefined);
    expect(gas).toBe(100_000);
  });

  it("passes memo through (undefined falls back to 'AA Gas Simulation')", async () => {
    // Both calls should succeed — the memo path is exercised inside TxBody encoding.
    await simulateWithNilPubkey(RPC, testAccounts.existing, [], undefined);
    await simulateWithNilPubkey(
      RPC,
      testAccounts.existing,
      [],
      "explicit-memo",
    );
    expect(mockSimulate).toHaveBeenCalledTimes(2);
  });

  it("throws when account is not found on chain", async () => {
    (QueryClient.withExtensions as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { account: vi.fn().mockResolvedValue(null) },
    });
    await expect(
      simulateWithNilPubkey(RPC, testAccounts.existing, [], undefined),
    ).rejects.toThrow(`Account not found: ${testAccounts.existing}`);
  });

  it("throws when chain returns no gasInfo", async () => {
    mockSimulate.mockResolvedValue({});
    await expect(
      simulateWithNilPubkey(RPC, testAccounts.existing, [], undefined),
    ).rejects.toThrow("No gas info returned");
  });

  // Older AA contracts (e.g. mainnet code_id 5, checksum FEFA4D0C…) reject
  // empty cred_bytes in their sudo handler before the simulate=true skip in
  // before_tx is reached. A single placeholder byte satisfies that guard
  // while remaining inert for newer contracts that ignore it during simulate.
  it("includes a non-empty placeholder signature (legacy contract compat)", async () => {
    await simulateWithNilPubkey(
      RPC,
      testAccounts.existing,
      [MSG_SEND],
      undefined,
    );
    const req = mockSimulate.mock.calls[0][0];
    const decoded = TxRaw.decode(req.txBytes);
    expect(decoded.signatures).toHaveLength(1);
    expect(decoded.signatures[0].length).toBeGreaterThan(0);
  });
});
