/**
 * Unit tests for DaoDaoAccountStrategy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DaoDaoAccountStrategy } from "../account-daodao-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";
import { fromBech32, toBech32 } from "@cosmjs/encoding";

global.fetch = vi.fn();

const okJson = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
});

const ACCOUNT_A =
  "xion1424242424242424242424242424242424242424242424242424q280v08";
const ACCOUNT_B =
  "xion1hwamhwamhwamhwamhwamhwamhwamhwamhwamhwamhwamhwamhwas3jrp9f";
const ACCOUNT_A_BYTES = fromBech32(ACCOUNT_A).data;
const ETH_ADDRESS = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";

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
      {
        headers: { Accept: "application/json" },
        signal: expect.any(AbortSignal),
      },
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
          address: ACCOUNT_A,
          codeId: 1880,
          authenticators: [
            { index: 0, type: "EthWallet", authenticator: "0xother" },
            { index: 3, type: "JWT", authenticator: "aud.sub" },
          ],
        },
        {
          address: ACCOUNT_B,
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
        id: ACCOUNT_A,
        codeId: 1880,
        authenticators: [
          {
            id: `${ACCOUNT_A}-0`,
            authenticator: "0xother",
            authenticatorIndex: 0,
            type: "EthWallet",
          },
          {
            id: `${ACCOUNT_A}-3`,
            authenticator: "aud.sub",
            authenticatorIndex: 3,
            type: "JWT",
          },
        ],
      },
      {
        id: ACCOUNT_B,
        codeId: 5,
        authenticators: [
          {
            id: `${ACCOUNT_B}-0`,
            authenticator: "aud.sub",
            authenticatorIndex: 0,
            type: "JWT",
          },
        ],
      },
    ]);
  });

  it("leaves out authenticators of a type the SDK has no signer for", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockResolvedValueOnce(
      okJson([
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [
            { index: 0, type: "Secp256R1", authenticator: "r1key" },
            { index: 1, type: "JWT", authenticator: "aud.sub" },
          ],
        },
      ]),
    );

    const [account] = await strategy.fetchSmartAccounts(
      "aud.sub",
      AUTHENTICATOR_TYPE.JWT,
    );

    expect(account.authenticators).toEqual([
      {
        id: `${ACCOUNT_A}-1`,
        authenticator: "aud.sub",
        authenticatorIndex: 1,
        type: "JWT",
      },
    ]);
  });

  it("fails without a request for an invalid EthWallet address", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );

    await expect(
      strategy.fetchSmartAccounts("0xab", AUTHENTICATOR_TYPE.EthWallet),
    ).rejects.toThrow(
      "DaoDao account strategy failed: Invalid Ethereum address format",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fails without a request for a type the indexer does not index", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );

    await expect(
      strategy.fetchSmartAccounts("sr-key", AUTHENTICATOR_TYPE.Sr25519),
    ).rejects.toThrow(
      "DaoDao account strategy failed: the DaoDao indexer does not index Sr25519 authenticators",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns an empty list for a miss", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockResolvedValueOnce(okJson([]));

    await expect(
      strategy.fetchSmartAccounts(ETH_ADDRESS, AUTHENTICATOR_TYPE.EthWallet),
    ).resolves.toEqual([]);
  });

  it.each([null, {}, "[]"])(
    "throws on a 200 body that is not an account list (%j)",
    async (body) => {
      const strategy = new DaoDaoAccountStrategy(
        "https://daodaoindexer.burnt.com",
        "xion-mainnet-1",
      );
      (global.fetch as any).mockResolvedValueOnce(okJson(body));

      await expect(
        strategy.fetchSmartAccounts(ETH_ADDRESS, AUTHENTICATOR_TYPE.EthWallet),
      ).rejects.toThrow(
        "DaoDao account strategy failed: DaoDao indexer returned a non-list response",
      );
    },
  );

  it.each([
    ["an entry that is not an object", [null]],
    ["an empty address", [{ address: "", codeId: 5, authenticators: [] }]],
    [
      "an address that is not bech32",
      [{ address: "xion1aaa", codeId: 5, authenticators: [] }],
    ],
    [
      "another chain's address",
      [
        {
          address: toBech32("cosmos", ACCOUNT_A_BYTES),
          codeId: 5,
          authenticators: [],
        },
      ],
    ],
    [
      "a 20-byte (user) address",
      [
        {
          address: toBech32("xion", ACCOUNT_A_BYTES.slice(0, 20)),
          codeId: 5,
          authenticators: [],
        },
      ],
    ],
    [
      "a non-canonical (upper-case) address",
      [{ address: ACCOUNT_A.toUpperCase(), codeId: 5, authenticators: [] }],
    ],
    ["a zero codeId", [{ address: ACCOUNT_A, codeId: 0, authenticators: [] }]],
    [
      "a non-numeric codeId",
      [{ address: ACCOUNT_A, codeId: "bad", authenticators: [] }],
    ],
    ["missing authenticators", [{ address: ACCOUNT_A, codeId: 5 }]],
    [
      "a non-integer authenticator index",
      [
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [{ index: "x", type: "JWT", authenticator: "a.b" }],
        },
      ],
    ],
    [
      "an authenticator type the indexer does not use",
      [
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [{ index: 3, type: "jwt", authenticator: "a.b" }],
        },
      ],
    ],
    [
      "an empty authenticator identity",
      [
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [{ index: 0, type: "JWT", authenticator: "" }],
        },
      ],
    ],
    [
      "a non-string authenticator",
      [
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [{ index: 0, type: "JWT", authenticator: 7 }],
        },
      ],
    ],
  ])("throws on a malformed account entry: %s", async (_, body) => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    (global.fetch as any).mockResolvedValueOnce(okJson(body));

    await expect(
      strategy.fetchSmartAccounts("a.b", AUTHENTICATOR_TYPE.JWT),
    ).rejects.toThrow(
      "DaoDao account strategy failed: DaoDao indexer returned a malformed account entry",
    );
  });

  it.each([
    ["no authenticators", []],
    [
      "a different identity of the queried type",
      [{ index: 3, type: "JWT", authenticator: "aud.other" }],
    ],
    [
      "the identity under another type",
      [{ index: 0, type: "Passkey", authenticator: "aud.sub" }],
    ],
    [
      "the identity in another case",
      [{ index: 0, type: "JWT", authenticator: "aud.SUB" }],
    ],
  ])(
    "throws when an account lacks the queried authenticator: %s",
    async (_, authenticators) => {
      const strategy = new DaoDaoAccountStrategy(
        "https://daodaoindexer.burnt.com",
        "xion-mainnet-1",
      );
      (global.fetch as any).mockResolvedValueOnce(
        okJson([
          {
            address: ACCOUNT_B,
            codeId: 5,
            authenticators: [
              { index: 0, type: "JWT", authenticator: "aud.sub" },
            ],
          },
          { address: ACCOUNT_A, codeId: 5, authenticators },
        ]),
      );

      await expect(
        strategy.fetchSmartAccounts("aud.sub", AUTHENTICATOR_TYPE.JWT),
      ).rejects.toThrow(
        "DaoDao account strategy failed: DaoDao indexer returned an account without the queried authenticator",
      );
    },
  );

  it("queries a hex Secp256K1 key as the base64 the indexer stores", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    const hex = `02${"ab".repeat(32)}`;
    const base64 = Buffer.from(hex, "hex").toString("base64");
    (global.fetch as any).mockResolvedValueOnce(
      okJson([
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [
            { index: 1, type: "Secp256K1", authenticator: base64 },
          ],
        },
      ]),
    );

    const [account] = await strategy.fetchSmartAccounts(
      hex,
      AUTHENTICATOR_TYPE.Secp256K1,
    );

    const url = new URL((global.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("authenticator")).toBe(base64);
    expect(account.authenticators[0].authenticatorIndex).toBe(1);
  });

  it("queries a hex Ed25519 key as the base64 the indexer stores", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    const hex = "d".repeat(64);
    const base64 = Buffer.from(hex, "hex").toString("base64");
    (global.fetch as any).mockResolvedValueOnce(
      okJson([
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [
            { index: 2, type: "Ed25519", authenticator: base64 },
          ],
        },
      ]),
    );

    const [account] = await strategy.fetchSmartAccounts(
      hex,
      AUTHENTICATOR_TYPE.Ed25519,
    );

    const url = new URL((global.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("authenticator")).toBe(base64);
    expect(account.authenticators[0].authenticatorIndex).toBe(2);
  });

  it("queries a checksummed EthWallet address lowercase and matches it", async () => {
    const strategy = new DaoDaoAccountStrategy(
      "https://daodaoindexer.burnt.com",
      "xion-mainnet-1",
    );
    const lower = ETH_ADDRESS;
    (global.fetch as any).mockResolvedValueOnce(
      okJson([
        {
          address: ACCOUNT_A,
          codeId: 5,
          authenticators: [
            { index: 2, type: "EthWallet", authenticator: lower },
          ],
        },
      ]),
    );

    const [account] = await strategy.fetchSmartAccounts(
      "0xC2E80cf7D5A108d4ABc97b5C5A95B2515ef90Cb5",
      AUTHENTICATOR_TYPE.EthWallet,
    );

    const url = new URL((global.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("authenticator")).toBe(lower);
    expect(account.id).toBe(ACCOUNT_A);
    expect(account.authenticators[0].authenticatorIndex).toBe(2);
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

  describe("timeout", () => {
    // A fetch that never answers until its signal aborts, like a stalled indexer.
    const stalledFetch = (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("This operation was aborted", "AbortError")),
        );
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("aborts a stalled request after the default 30 seconds", async () => {
      const strategy = new DaoDaoAccountStrategy(
        "https://daodaoindexer.burnt.com",
        "xion-mainnet-1",
      );
      (global.fetch as any).mockImplementationOnce(stalledFetch);

      const result = strategy.fetchSmartAccounts(
        "aud.sub",
        AUTHENTICATOR_TYPE.JWT,
      );
      const assertion = expect(result).rejects.toThrow(
        "DaoDao account strategy failed: DaoDao indexer request timed out after 30000ms",
      );
      await vi.advanceTimersByTimeAsync(29999);
      const signal: AbortSignal = (global.fetch as any).mock.calls[0][1].signal;
      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await assertion;
      expect(signal.aborted).toBe(true);
    });

    it("uses the configured timeout", async () => {
      const strategy = new DaoDaoAccountStrategy(
        "https://daodaoindexer.burnt.com",
        "xion-mainnet-1",
        500,
      );
      (global.fetch as any).mockImplementationOnce(stalledFetch);

      const result = strategy.fetchSmartAccounts(
        "aud.sub",
        AUTHENTICATOR_TYPE.JWT,
      );
      const assertion = expect(result).rejects.toThrow(
        "DaoDao account strategy failed: DaoDao indexer request timed out after 500ms",
      );
      await vi.advanceTimersByTimeAsync(500);
      await assertion;
    });

    it("clears the timer once the request settles", async () => {
      const strategy = new DaoDaoAccountStrategy(
        "https://daodaoindexer.burnt.com",
        "xion-mainnet-1",
      );
      (global.fetch as any).mockResolvedValueOnce(okJson([]));

      await strategy.fetchSmartAccounts("aud.sub", AUTHENTICATOR_TYPE.JWT);

      expect(vi.getTimerCount()).toBe(0);
    });

    it("clears the timer when the request fails", async () => {
      const strategy = new DaoDaoAccountStrategy(
        "https://daodaoindexer.burnt.com",
        "xion-mainnet-1",
      );
      (global.fetch as any).mockRejectedValueOnce(new Error("socket hang up"));

      await expect(
        strategy.fetchSmartAccounts("aud.sub", AUTHENTICATOR_TYPE.JWT),
      ).rejects.toThrow("DaoDao account strategy failed: socket hang up");
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
