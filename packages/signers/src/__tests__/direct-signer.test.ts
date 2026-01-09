import { describe, it, expect, vi } from "vitest";
import { AADirectSigner } from "../signers/direct-signer";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

describe("AADirectSigner", () => {
  const mockAccount = "xion1mockaccount";
  const mockIndex = 0;
  const mockSignerAddress = "cosmos1signer";

  const mockOfflineSigner = {
    getAccounts: vi.fn().mockResolvedValue([{ address: mockSignerAddress }]),
  };

  const mockSignArbFn = vi.fn().mockResolvedValue({
    signature: "mock-signature",
    pub_key: { type: "type", value: "value" },
  });

  it("should initialize correctly", () => {
    const signer = new AADirectSigner(
      mockOfflineSigner,
      mockAccount,
      mockIndex,
      mockSignArbFn,
    );
    expect(signer).toBeDefined();
  });

  it("should return accounts", async () => {
    const signer = new AADirectSigner(
      mockOfflineSigner,
      mockAccount,
      mockIndex,
      mockSignArbFn,
    );
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].address).toBe(mockAccount);
    expect(accounts[0].authenticatorId).toBe(mockIndex);
    expect(accounts[0].accountAddress).toBe(mockSignerAddress);
  });

  it("should return empty accounts if abstract account is undefined", async () => {
    const signer = new AADirectSigner(
      mockOfflineSigner,
      undefined as any,
      mockIndex,
      mockSignArbFn,
    );
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(0);
  });

  it("should return empty accounts if offline signer returns no accounts", async () => {
    const emptySigner = { getAccounts: vi.fn().mockResolvedValue([]) };
    const signer = new AADirectSigner(
      emptySigner,
      mockAccount,
      mockIndex,
      mockSignArbFn,
    );
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(0);
  });

  it("should log warning if offline signer returns multiple accounts", async () => {
    const multipleAccountsSigner = {
      getAccounts: vi
        .fn()
        .mockResolvedValue([{ address: "addr1" }, { address: "addr2" }]),
    };
    const signer = new AADirectSigner(
      multipleAccountsSigner,
      mockAccount,
      mockIndex,
      mockSignArbFn,
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const accounts = await signer.getAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountAddress).toBe("addr1");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Signer returned more than 1 account",
    );

    consoleSpy.mockRestore();
  });

  it("should sign direct", async () => {
    const signer = new AADirectSigner(
      mockOfflineSigner,
      mockAccount,
      mockIndex,
      mockSignArbFn,
    );
    const mockSignDoc = SignDoc.fromPartial({
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      chainId: "test-chain",
      accountNumber: 1n,
    });

    const response = await signer.signDirect(mockSignerAddress, mockSignDoc);

    expect(response.signed).toEqual(mockSignDoc);
    expect(response.signature.signature).toBe("mock-signature");
    expect(mockSignArbFn).toHaveBeenCalledWith(
      "test-chain",
      mockSignerAddress,
      expect.any(Uint8Array),
    );
  });
});
