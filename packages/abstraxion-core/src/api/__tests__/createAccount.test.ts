/**
 * 🔴 CRITICAL: Account Creation Tests
 *
 * Tests for high-level account creation functions.
 * The smart-account address comes from the AA API (GET /address); these tests
 * pin that the SDK signs exactly that address, never a locally derived one,
 * and that nothing is signed or posted when the lookup fails.
 * API endpoints are tested in @account-abstraction-api/tests/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createEthWalletAccount,
  createSecp256k1Account,
} from "../createAccount";
import {
  ETH_WALLET_TEST_DATA,
  SECP256K1_TEST_DATA,
  TEST_ADDRESSES,
} from "@burnt-labs/test-utils";

// Live-read testnet fixture: GET /api/v2/account/address/ethwallet/<EVM>
const EVM = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";
const CANDIDATE =
  "xion1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3ws90atef";
// utf8ToHex(CANDIDATE) with 0x prefix, written out literally
const CANDIDATE_SIGNED_BYTES =
  "0x78696f6e31733771366c70746a77386a3232706565766877657365357265726e76773076383366737570786c63636a78356139726379337773393061746566";
// A checksum that does NOT derive CANDIDATE (stale testnet legacy value)
const STALE_CHECKSUM =
  "D27A379FF65EB47A9E538E3A3D46101DE2A6C0B86BA3D0BF014C0403849414E6";

// Secp256K1 fixture: hex key whose base64 form contains "+" and "/"
const SECP_PUBKEY_HEX =
  "0221a45beda298dd79d8e1aae1d332252fc9e0ec861ab8eda571578cc5404b3da9";
const SECP_PUBKEY_BASE64 = "AiGkW+2imN152OGq4dMyJS/J4OyGGrjtpXFXjMVASz2p";
const SECP_CANDIDATE =
  "xion15k0lncpkc93p79sl9fjfs0hwn7hjajsvclnv5k3xeguwe08yme9sttujm4";
const SECP_CANDIDATE_SIGNED_BYTES =
  "0x78696f6e31356b306c6e63706b633933703739736c39666a66733068776e37686a616a7376636c6e76356b337865677577653038796d6539737474756a6d34";
const SECP_SIGNATURE_HEX = "ab".repeat(64);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function ethAddressResponse(address = CANDIDATE): Response {
  return jsonResponse({ address, authenticator_type: "EthWallet" });
}

function secpAddressResponse(address = SECP_CANDIDATE): Response {
  return jsonResponse({ address, authenticator_type: "Secp256K1" });
}

function createResponse(accountAddress: string): Response {
  return jsonResponse({
    account_address: accountAddress,
    code_id: 1880,
    transaction_hash: "HASH",
  });
}

describe("createAccount - Validation Logic", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("🔴 CRITICAL: aa-api address source", () => {
    it("signs the aa-api address without any checksum", async () => {
      const candidate =
        "xion1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3ws90atef";
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              address: candidate,
              authenticator_type: "EthWallet",
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ account_address: candidate, code_id: 1880 }),
            { status: 200 },
          ),
        );
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue("0xsig");
      const result = await createEthWalletAccount(
        "https://api.example",
        "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5",
        sign,
        { addressSource: "aa-api", addressPrefix: "xion" },
      );
      expect(sign).toHaveBeenCalledWith(
        "0x78696f6e31733771366c70746a77386a3232706565766877657365357265726e76773076383366737570786c63636a78356139726379337773393061746566",
      );
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example/api/v2/account/address/ethwallet/0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5",
      );
      expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
        address: "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5",
        signature: "0xsig",
      });
      expect(result.account_address).toBe(candidate);
    });

    it("looks the address up before asking the wallet to sign", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(ethAddressResponse())
        .mockResolvedValueOnce(createResponse(CANDIDATE));
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue("0xsig");

      await createEthWalletAccount("https://api.example", EVM, sign, {
        addressSource: "aa-api",
        addressPrefix: "xion",
      });

      expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(
        sign.mock.invocationCallOrder[0],
      );
      expect(sign.mock.invocationCallOrder[0]).toBeLessThan(
        fetchMock.mock.invocationCallOrder[1],
      );
      expect(fetchMock.mock.calls[1][0]).toBe(
        "https://api.example/api/v2/accounts/create/ethwallet",
      );
    });

    it("normalizes a mixed-case EVM address identically for GET and POST", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(ethAddressResponse())
        .mockResolvedValueOnce(createResponse(CANDIDATE));
      global.fetch = fetchMock;

      await createEthWalletAccount(
        "https://api.example",
        "0xC2E80CF7D5A108D4ABC97B5C5A95B2515EF90CB5",
        vi.fn().mockResolvedValue("0xsig"),
        { addressSource: "aa-api", addressPrefix: "xion" },
      );

      expect(fetchMock.mock.calls[0][0]).toBe(
        `https://api.example/api/v2/account/address/ethwallet/${EVM}`,
      );
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).address).toBe(EVM);
    });

    it("creates a Secp256K1 account from the aa-api address with one normalized pubkey", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(secpAddressResponse())
        .mockResolvedValueOnce(createResponse(SECP_CANDIDATE));
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue(SECP_SIGNATURE_HEX);

      const result = await createSecp256k1Account(
        "https://api.example",
        SECP_PUBKEY_HEX,
        sign,
        { addressSource: "aa-api", addressPrefix: "xion" },
      );

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example/api/v2/account/address/secp256k1/AiGkW%2B2imN152OGq4dMyJS%2FJ4OyGGrjtpXFXjMVASz2p",
      );
      expect(sign).toHaveBeenCalledWith(SECP_CANDIDATE_SIGNED_BYTES);
      expect(fetchMock.mock.calls[1][0]).toBe(
        "https://api.example/api/v2/accounts/create/secp256k1",
      );
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
        pubKey: SECP_PUBKEY_BASE64,
        signature: SECP_SIGNATURE_HEX,
      });
      expect(result.account_address).toBe(SECP_CANDIDATE);
    });

    it("accepts an uncompressed hex pubkey (normalized once for GET and POST)", async () => {
      const uncompressedHex = "04" + "a1".repeat(64);
      const uncompressedBase64 =
        "BKGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaE=";
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(secpAddressResponse())
        .mockResolvedValueOnce(createResponse(SECP_CANDIDATE));
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue(SECP_SIGNATURE_HEX);

      await createSecp256k1Account(
        "https://api.example",
        uncompressedHex,
        sign,
        { addressSource: "aa-api", addressPrefix: "xion" },
      );

      expect(fetchMock.mock.calls[0][0]).toBe(
        `https://api.example/api/v2/account/address/secp256k1/${encodeURIComponent(uncompressedBase64)}`,
      );
      expect(sign).toHaveBeenCalledWith(SECP_CANDIDATE_SIGNED_BYTES);
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).pubKey).toBe(
        uncompressedBase64,
      );
    });

    it("rejects a create response for a different account than the one signed", async () => {
      const other =
        "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(ethAddressResponse())
        .mockResolvedValueOnce(createResponse(other));
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue("0xsig");

      await expect(
        createEthWalletAccount("https://api.example", EVM, sign, {
          addressSource: "aa-api",
          addressPrefix: "xion",
        }),
      ).rejects.toThrow(
        `AA API created account "${other}" but the signed address was "${CANDIDATE}"`,
      );
      // No automatic re-sign or retry against another address
      expect(sign).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("rejects a Secp256K1 create response for a different account", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(secpAddressResponse())
        .mockResolvedValueOnce(createResponse(CANDIDATE));
      global.fetch = fetchMock;

      await expect(
        createSecp256k1Account(
          "https://api.example",
          SECP_PUBKEY_HEX,
          vi.fn().mockResolvedValue(SECP_SIGNATURE_HEX),
          { addressSource: "aa-api", addressPrefix: "xion" },
        ),
      ).rejects.toThrow("but the signed address was");
    });

    it("does not POST when the wallet refuses to sign", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(ethAddressResponse());
      global.fetch = fetchMock;

      await expect(
        createEthWalletAccount(
          "https://api.example",
          EVM,
          vi.fn().mockRejectedValue(new Error("user rejected")),
          { addressSource: "aa-api", addressPrefix: "xion" },
        ),
      ).rejects.toThrow("user rejected");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("rejects an unsupported addressSource and an empty prefix before any request", async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;
      const sign = vi.fn();

      await expect(
        createEthWalletAccount("https://api.example", EVM, sign, {
          addressSource: "local",
          addressPrefix: "xion",
        } as any),
      ).rejects.toThrow('Unsupported addressSource "local"');
      await expect(
        createEthWalletAccount("https://api.example", EVM, sign, {
          addressSource: "aa-api",
          addressPrefix: "",
        }),
      ).rejects.toThrow("addressPrefix is required");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
    });

    describe("lookup failures never sign or POST", () => {
      const cases: Array<{
        name: string;
        response: () => Response | Promise<never>;
        error: string;
      }> = [
        {
          name: "HTTP error",
          response: () =>
            jsonResponse({ error: { message: "upstream down" } }, 502),
          error: "upstream down",
        },
        {
          name: "404 from /address",
          response: () =>
            jsonResponse({ error: { message: "not found" } }, 404),
          error: "not found",
        },
        {
          name: "invalid JSON",
          response: () => new Response("{not json", { status: 200 }),
          error: "returned invalid JSON",
        },
        {
          name: "missing address",
          response: () => jsonResponse({ authenticator_type: "EthWallet" }),
          error: "response is missing an address",
        },
        {
          name: "wrong authenticator type",
          response: () =>
            jsonResponse({ address: CANDIDATE, authenticator_type: "JWT" }),
          error: 'returned authenticator_type "JWT", expected "EthWallet"',
        },
        {
          name: "wrong prefix",
          response: () =>
            ethAddressResponse(
              "cosmos1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3wsl6w8qj",
            ),
          error: 'with prefix "cosmos", expected "xion"',
        },
        {
          name: "malformed Bech32",
          response: () => ethAddressResponse(`${CANDIDATE.slice(0, -1)}x`),
          error: "malformed Bech32 address",
        },
        {
          name: "20-byte address",
          response: () =>
            ethAddressResponse("xion1s7q6lptjw8j22peevhwese5rernvw0v8kcz4uy"),
          error: "of 20 bytes, expected 32",
        },
        {
          name: "network failure",
          response: () => Promise.reject(new TypeError("Failed to fetch")),
          error: "Failed to fetch",
        },
      ];

      it.each(cases)("$name", async ({ response, error }) => {
        const fetchMock = vi.fn().mockImplementationOnce(response);
        global.fetch = fetchMock;
        const sign = vi.fn().mockResolvedValue("0xsig");

        await expect(
          createEthWalletAccount("https://api.example", EVM, sign, {
            addressSource: "aa-api",
            addressPrefix: "xion",
          }),
        ).rejects.toThrow(error);
        expect(sign).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it("deadline abort", async () => {
        vi.useFakeTimers();
        let signal: AbortSignal | undefined;
        const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
          signal = init?.signal ?? undefined;
          return new Promise<Response>(() => {});
        });
        global.fetch = fetchMock as any;
        const sign = vi.fn();

        const pending = createSecp256k1Account(
          "https://api.example",
          SECP_PUBKEY_HEX,
          sign,
          { addressSource: "aa-api", addressPrefix: "xion" },
        );
        const assertion = expect(pending).rejects.toThrow(
          "lookup timed out after 10000ms",
        );
        await vi.advanceTimersByTimeAsync(10_000);
        await assertion;

        expect(signal?.aborted).toBe(true);
        expect(sign).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("🔴 CRITICAL: deprecated positional signature", () => {
    it("signs the aa-api address even with a stale checksum (EthWallet)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(ethAddressResponse())
        .mockResolvedValueOnce(createResponse(CANDIDATE));
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue("0xsig");

      const result = await createEthWalletAccount(
        "https://api.example",
        EVM,
        sign,
        STALE_CHECKSUM,
        TEST_ADDRESSES.account,
        "xion",
      );

      expect(sign).toHaveBeenCalledWith(CANDIDATE_SIGNED_BYTES);
      expect(fetchMock.mock.calls[0][0]).toBe(
        `https://api.example/api/v2/account/address/ethwallet/${EVM}`,
      );
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
        address: EVM,
        signature: "0xsig",
      });
      expect(result.account_address).toBe(CANDIDATE);
    });

    it("signs the aa-api address even with a stale checksum (Secp256K1)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(secpAddressResponse())
        .mockResolvedValueOnce(createResponse(SECP_CANDIDATE));
      global.fetch = fetchMock;
      const sign = vi.fn().mockResolvedValue(SECP_SIGNATURE_HEX);

      await createSecp256k1Account(
        "https://api.example",
        SECP_PUBKEY_HEX,
        sign,
        STALE_CHECKSUM,
        TEST_ADDRESSES.account,
        "xion",
        "https://rpc.example",
      );

      expect(sign).toHaveBeenCalledWith(SECP_CANDIDATE_SIGNED_BYTES);
    });

    it("rejects a positional call missing feeGranter/addressPrefix", async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      await expect(
        (createEthWalletAccount as any)(
          "https://api.example",
          EVM,
          vi.fn(),
          STALE_CHECKSUM,
        ),
      ).rejects.toThrow("feeGranter and addressPrefix are required");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("🔴 CRITICAL: createEthWalletAccount - feeGranter Validation", () => {
    it("should throw if feeGranter does not start with addressPrefix", async () => {
      const signMessageFn = vi.fn();
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      await expect(
        createEthWalletAccount(
          "http://test-api",
          ETH_WALLET_TEST_DATA.address,
          signMessageFn,
          ETH_WALLET_TEST_DATA.config.checksum,
          "cosmos1invalidprefix", // Wrong prefix
          "xion", // Expected prefix
        ),
      ).rejects.toThrow(
        'feeGranter address "cosmos1invalidprefix" must start with addressPrefix "xion"',
      );

      expect(signMessageFn).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should accept valid feeGranter with correct prefix", async () => {
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(ethAddressResponse())
        .mockResolvedValueOnce(createResponse(CANDIDATE));

      await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      expect(signMessageFn).toHaveBeenCalled();
      // Verify that signMessageFn was called with hex format (0x prefix)
      const callArgs = signMessageFn.mock.calls[0][0];
      expect(callArgs).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(callArgs).toBe(CANDIDATE_SIGNED_BYTES);
    });
  });

  describe("🔴 CRITICAL: createSecp256k1Account - feeGranter Validation", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";

    it("should throw if feeGranter does not start with addressPrefix", async () => {
      const signMessageFn = vi.fn();
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      await expect(
        createSecp256k1Account(
          "http://test-api",
          validPubkeyHex,
          signMessageFn,
          SECP256K1_TEST_DATA.config.checksum,
          "cosmos1invalidprefix",
          "xion",
        ),
      ).rejects.toThrow(
        'feeGranter address "cosmos1invalidprefix" must start with addressPrefix "xion"',
      );

      expect(signMessageFn).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should accept valid feeGranter with correct prefix", async () => {
      // Valid base64 signature (standard base64, no special chars that might cause issues)
      const validBase64Sig =
        "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(secpAddressResponse())
        .mockResolvedValueOnce(createResponse(SECP_CANDIDATE));

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      expect(signMessageFn).toHaveBeenCalled();
      // Verify that signMessageFn was called with hex format (0x prefix)
      const callArgs = signMessageFn.mock.calls[0][0];
      expect(callArgs).toMatch(/^0x[0-9a-fA-F]+$/);
      expect(callArgs).toBe(SECP_CANDIDATE_SIGNED_BYTES);
    });
  });

  describe("Address Lowercase Conversion", () => {
    it("should convert ethereum address to lowercase in API call", async () => {
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(ethAddressResponse())
        .mockResolvedValueOnce(createResponse(CANDIDATE));
      global.fetch = mockFetch;

      await createEthWalletAccount(
        "http://test-api",
        "0x742D35Cc6634C0532925a3b844Bc9e7595f0bEb0", // Mixed case
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      expect(mockFetch.mock.calls[0][0]).toBe(
        "http://test-api/api/v2/account/address/ethwallet/0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
      );
      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.address).toBe(
        "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
      );
    });
  });
});
