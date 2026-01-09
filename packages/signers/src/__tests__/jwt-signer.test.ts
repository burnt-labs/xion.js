import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AbstractAccountJWTSigner } from "../signers/jwt-signer";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

describe("AbstractAccountJWTSigner", () => {
  const mockAccount = "xion1mockaccount";
  const mockIndex = 0;
  const mockToken = "mock-session-token";
  const mockApiUrl = "https://mock-stytch.com/v1";

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize correctly", () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
      mockApiUrl,
    );
    expect(signer).toBeDefined();
  });

  it("should return accounts", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
      mockApiUrl,
    );
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].address).toBe(mockAccount);
    expect(accounts[0].authenticatorId).toBe(mockIndex);
  });

  it("should return empty accounts if abstract account is undefined", async () => {
    const signer = new AbstractAccountJWTSigner(
      undefined as any,
      mockIndex,
      mockToken,
    );
    const accounts = await signer.getAccounts();
    expect(accounts).toHaveLength(0);
  });

  it("should sign direct", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    const mockSignDoc = SignDoc.fromPartial({
      bodyBytes: new Uint8Array([1, 2, 3]),
      authInfoBytes: new Uint8Array([4, 5, 6]),
      chainId: "test-chain",
      accountNumber: 1n,
    });

    const mockResponse = {
      ok: true,
      json: async () => ({ session_jwt: "mock-jwt" }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const response = await signer.signDirect("user@example.com", mockSignDoc);

    expect(response.signed).toEqual(mockSignDoc);
    expect(response.signature.signature).toBe(
      Buffer.from("mock-jwt").toString("base64"),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://mock-stytch.com/v1/sessions/authenticate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mock-session-token"),
      }),
    );
  });

  it("should throw error if session token is undefined", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      undefined,
    );
    const mockSignDoc = SignDoc.fromPartial({});
    await expect(signer.signDirect("user", mockSignDoc)).rejects.toThrow(
      "stytch session token is undefined",
    );
  });

  it("should throw error if fetch fails", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    const mockSignDoc = SignDoc.fromPartial({});
    (global.fetch as any).mockResolvedValue({ ok: false });

    await expect(signer.signDirect("user", mockSignDoc)).rejects.toThrow(
      "Failed to authenticate with stytch",
    );
  });

  it("should throw error if no session_jwt in response", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    const mockSignDoc = SignDoc.fromPartial({});
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(signer.signDirect("user", mockSignDoc)).rejects.toThrow(
      "No session_jwt in response",
    );
  });

  it("should sign arbitrary message", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    const message = "hello world";

    const mockResponse = {
      ok: true,
      json: async () => ({ session_jwt: "mock-jwt" }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const response = await signer.signDirectArb(message);

    expect(response.signature).toBe(Buffer.from("mock-jwt").toString("base64"));
    expect(global.fetch).toHaveBeenCalledWith(
      "https://mock-stytch.com/v1/sessions/authenticate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mock-session-token"),
      }),
    );
  });

  it("should sign arbitrary message with custom token", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    const message = "hello world";
    const customToken = "custom-token";

    const mockResponse = {
      ok: true,
      json: async () => ({ session_jwt: "mock-jwt" }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    await signer.signDirectArb(message, customToken);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://mock-stytch.com/v1/sessions/authenticate",
      expect.objectContaining({
        body: expect.stringContaining(customToken),
      }),
    );
  });

  it("should throw error in signDirectArb if session token is undefined", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      undefined,
    );
    await expect(signer.signDirectArb("msg")).rejects.toThrow(
      "stytch session token is undefined",
    );
  });

  it("should throw error in signDirectArb if fetch fails", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    (global.fetch as any).mockResolvedValue({ ok: false });

    await expect(signer.signDirectArb("msg")).rejects.toThrow(
      "Failed to authenticate with stytch",
    );
  });

  it("should throw error in signDirectArb if no session_jwt", async () => {
    const signer = new AbstractAccountJWTSigner(
      mockAccount,
      mockIndex,
      mockToken,
    );
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(signer.signDirectArb("msg")).rejects.toThrow(
      "No session_jwt in response",
    );
  });
});
