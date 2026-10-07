/**
 * Unit tests for DaoDaoAccountStrategy
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DaoDaoAccountStrategy } from "../account-daodao-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

global.fetch = vi.fn();

const okJson = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
});

describe("DaoDaoAccountStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries accountsByAuthenticator for the chain with type and encoded identity", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com/",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockResolvedValueOnce(okJson([]));

    await strategy.fetchSmartAccounts("A+b/c=", AUTHENTICATOR_TYPE.Secp256K1);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://daodaoindexer.burnt.com/xion-mainnet-1/generic/_/xion/accountsByAuthenticator?type=Secp256K1&authenticator=A%2Bb%2Fc%3D",
      { headers: { Accept: "application/json" } },
    );
  });

  it("maps every returned account and authenticator", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-testnet-2",
    );
    (global.fetch as any).mockResolvedValueOnce(
      okJson([
        {
          address: "xion1aaa",
          codeId: 1880,
          authenticators: [
            { index: 0, type: "EthWallet", authenticator: "0xother" },
            { index: 3, type: "JWT", authenticator: "aud.sub" },
          ],
        },
        {
          address: "xion1bbb",
          codeId: 5,
          authenticators: [{ index: 0, type: "JWT", authenticator: "aud.sub" }],
        },
      ]),
    );

    const result = await strategy.fetchSmartAccounts(
      "aud.sub",
      AUTHENTICATOR_TYPE.JWT,
    );

    expect(result).toEqual([
      {
        id: "xion1aaa",
        codeId: 1880,
        authenticators: [
          {
            id: "xion1aaa-0",
            authenticator: "0xother",
            authenticatorIndex: 0,
            type: "EthWallet",
          },
          {
            id: "xion1aaa-3",
            authenticator: "aud.sub",
            authenticatorIndex: 3,
            type: "JWT",
          },
        ],
      },
      {
        id: "xion1bbb",
        codeId: 5,
        authenticators: [
          {
            id: "xion1bbb-0",
            authenticator: "aud.sub",
            authenticatorIndex: 0,
            type: "JWT",
          },
        ],
      },
    ]);
  });

  it("returns an empty list for a miss", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockResolvedValueOnce(okJson([]));

    await expect(
      strategy.fetchSmartAccounts("0xab", AUTHENTICATOR_TYPE.EthWallet),
    ).resolves.toEqual([]);
  });

  it("throws on a non-2xx answer so the composite falls through", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(
      strategy.fetchSmartAccounts("aud.sub", AUTHENTICATOR_TYPE.JWT),
    ).rejects.toThrow(
      "DaoDao account strategy failed: DaoDao indexer request failed: 404 Not Found",
    );
  });

  it("wraps network errors", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockRejectedValueOnce(new Error("socket hang up"));

    await expect(
      strategy.fetchSmartAccounts("aud.sub", AUTHENTICATOR_TYPE.JWT),
    ).rejects.toThrow("DaoDao account strategy failed: socket hang up");
  });
});
