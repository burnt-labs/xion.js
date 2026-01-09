import { describe, it, expect, vi } from "vitest";
import { AAEthSigner } from "../signers/eth-signer";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

describe("AAEthSigner", () => {
  const mockAccount = "xion1mockaccount";
  const mockIndex = 0;
  const mockSignature = "0x123456";
  const mockPersonalSign = vi.fn().mockResolvedValue(mockSignature);

  it("should initialize correctly", () => {
    const signer = new AAEthSigner(mockAccount, mockIndex, mockPersonalSign);
    expect(signer).toBeDefined();
  });

  it("should return accounts", async () => {
    const signer = new AAEthSigner(mockAccount, mockIndex, mockPersonalSign);
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].address).toBe(mockAccount);
    expect(accounts[0].authenticatorId).toBe(mockIndex);
  });

  it("should return empty accounts if abstract account is undefined", async () => {
    const signer = new AAEthSigner(
      undefined as any,
      mockIndex,
      mockPersonalSign,
    );
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(0);
  });

  it("should sign direct", async () => {
    const signer = new AAEthSigner(mockAccount, mockIndex, mockPersonalSign);
    const mockSignDoc = SignDoc.fromPartial({
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      chainId: "test-chain",
      accountNumber: 1n,
    });

    const response = await signer.signDirect("user", mockSignDoc);

    expect(response.signed).toEqual(mockSignDoc);
    expect(response.signature.signature).toBeDefined();
    expect(mockPersonalSign).toHaveBeenCalledWith(expect.stringMatching(/^0x/));
  });
});
