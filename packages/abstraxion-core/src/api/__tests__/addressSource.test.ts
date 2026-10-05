/**
 * Tests for the AA API smart-account address source.
 *
 * resolveAAApiAccountAddress → GET /api/v2/account/address/{type}/{id}
 * findAAApiAccountAddress    → GET /api/v2/account/check/{type}/{id}
 *
 * Only an explicit HTTP 404 from /check means "no account"; every other
 * failure must reject.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AA_API_ADDRESS_LOOKUP_TIMEOUT_MS,
  findAAApiAccountAddress,
  normalizeAAApiIdentifier,
  resolveAAApiAccountAddress,
} from "../addressSource";
import type { AuthenticatorType } from "@burnt-labs/signers";

const API = "https://aa-api.example";
const EVM = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";
const EVM_MIXED = "0xC2E80cf7D5A108D4ABC97b5c5a95B2515EF90CB5";
const ETH_ADDRESS =
  "xion1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3ws90atef";
const SECP_PUBKEY_HEX =
  "0221a45beda298dd79d8e1aae1d332252fc9e0ec861ab8eda571578cc5404b3da9";
const SECP_PUBKEY_BASE64 = "AiGkW+2imN152OGq4dMyJS/J4OyGGrjtpXFXjMVASz2p";
const SECP_PUBKEY_URL = "AiGkW%2B2imN152OGq4dMyJS%2FJ4OyGGrjtpXFXjMVASz2p";
const SECP_ADDRESS =
  "xion15k0lncpkc93p79sl9fjfs0hwn7hjajsvclnv5k3xeguwe08yme9sttujm4";
const WRONG_PREFIX =
  "cosmos1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3wsl6w8qj";
const SHORT_ADDRESS = "xion1s7q6lptjw8j22peevhwese5rernvw0v8kcz4uy";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("addressSource", () => {
  let originalFetch: typeof global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("normalizeAAApiIdentifier", () => {
    it("lowercases EVM addresses", () => {
      expect(normalizeAAApiIdentifier("EthWallet", EVM_MIXED)).toBe(EVM);
    });

    it("converts a hex Secp256K1 key to base64 and leaves base64 unchanged", () => {
      expect(normalizeAAApiIdentifier("Secp256K1", SECP_PUBKEY_HEX)).toBe(
        SECP_PUBKEY_BASE64,
      );
      expect(normalizeAAApiIdentifier("Secp256K1", SECP_PUBKEY_BASE64)).toBe(
        SECP_PUBKEY_BASE64,
      );
    });

    it.each(["JWT", "Passkey", "Ed25519"] as AuthenticatorType[])(
      "rejects unsupported type %s",
      (type) => {
        expect(() => normalizeAAApiIdentifier(type, "x")).toThrow(
          `does not support authenticator type "${type}"`,
        );
      },
    );
  });

  describe("resolveAAApiAccountAddress (/address)", () => {
    const valid: Array<{
      name: string;
      authenticatorType: AuthenticatorType;
      identifier: string;
      url: string;
      body: Record<string, unknown>;
      expected: string;
    }> = [
      {
        name: "EthWallet",
        authenticatorType: "EthWallet",
        identifier: EVM,
        url: `${API}/api/v2/account/address/ethwallet/${EVM}`,
        body: { address: ETH_ADDRESS, authenticator_type: "EthWallet" },
        expected: ETH_ADDRESS,
      },
      {
        name: "mixed-case EthWallet normalized",
        authenticatorType: "EthWallet",
        identifier: EVM_MIXED,
        url: `${API}/api/v2/account/address/ethwallet/${EVM}`,
        body: { address: ETH_ADDRESS, authenticator_type: "EthWallet" },
        expected: ETH_ADDRESS,
      },
      {
        name: "Secp256K1 hex normalized once to base64 and URL-encoded",
        authenticatorType: "Secp256K1",
        identifier: SECP_PUBKEY_HEX,
        url: `${API}/api/v2/account/address/secp256k1/${SECP_PUBKEY_URL}`,
        body: { address: SECP_ADDRESS, authenticator_type: "Secp256K1" },
        expected: SECP_ADDRESS,
      },
      {
        name: "Secp256K1 base64 URL-encoded as one path component",
        authenticatorType: "Secp256K1",
        identifier: SECP_PUBKEY_BASE64,
        url: `${API}/api/v2/account/address/secp256k1/${SECP_PUBKEY_URL}`,
        body: { address: SECP_ADDRESS, authenticator_type: "Secp256K1" },
        expected: SECP_ADDRESS,
      },
    ];

    it.each(valid)(
      "$name",
      async ({ authenticatorType, identifier, url, body, expected }) => {
        fetchMock.mockResolvedValueOnce(jsonResponse(body));

        await expect(
          resolveAAApiAccountAddress({
            aaApiUrl: API,
            authenticatorType,
            identifier,
            addressPrefix: "xion",
          }),
        ).resolves.toBe(expected);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe(url);
        expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET" });
        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
      },
    );

    const invalid: Array<{
      name: string;
      response: () => Response | Promise<never>;
      error: string;
    }> = [
      {
        name: "HTTP error",
        response: () => jsonResponse({ error: { message: "boom" } }, 500),
        error: "boom",
      },
      {
        name: "invalid JSON",
        response: () => new Response("<html>", { status: 200 }),
        error: "AA API /address/ethwallet returned invalid JSON",
      },
      {
        name: "non-object body",
        response: () => jsonResponse([ETH_ADDRESS]),
        error: "returned a malformed response body",
      },
      {
        name: "missing address",
        response: () => jsonResponse({ authenticator_type: "EthWallet" }),
        error: "response is missing an address",
      },
      {
        name: "wrong authenticator type",
        response: () =>
          jsonResponse({
            address: ETH_ADDRESS,
            authenticator_type: "Secp256K1",
          }),
        error: 'returned authenticator_type "Secp256K1", expected "EthWallet"',
      },
      {
        name: "camelCase type field from /check is not accepted for /address",
        response: () =>
          jsonResponse({
            address: ETH_ADDRESS,
            authenticatorType: "EthWallet",
          }),
        error: 'returned authenticator_type "undefined"',
      },
      {
        name: "wrong prefix",
        response: () =>
          jsonResponse({
            address: WRONG_PREFIX,
            authenticator_type: "EthWallet",
          }),
        error: 'with prefix "cosmos", expected "xion"',
      },
      {
        name: "malformed Bech32",
        response: () =>
          jsonResponse({
            address: "xion1notbech32",
            authenticator_type: "EthWallet",
          }),
        error: "malformed Bech32 address",
      },
      {
        name: "wrong address length",
        response: () =>
          jsonResponse({
            address: SHORT_ADDRESS,
            authenticator_type: "EthWallet",
          }),
        error: "of 20 bytes, expected 32",
      },
      {
        name: "non-canonical (uppercase) address",
        response: () =>
          jsonResponse({
            address: ETH_ADDRESS.toUpperCase(),
            authenticator_type: "EthWallet",
          }),
        error: "returned a non-canonical address",
      },
      {
        name: "network error",
        response: () => Promise.reject(new TypeError("Failed to fetch")),
        error: "Failed to fetch",
      },
    ];

    it.each(invalid)("rejects $name", async ({ response, error }) => {
      fetchMock.mockImplementationOnce(response);

      await expect(
        resolveAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "EthWallet",
          identifier: EVM,
          addressPrefix: "xion",
        }),
      ).rejects.toThrow(error);
    });

    it("rejects unsupported authenticator types without a request", async () => {
      await expect(
        resolveAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "JWT",
          identifier: "aud.sub",
          addressPrefix: "xion",
        }),
      ).rejects.toThrow('does not support authenticator type "JWT"');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a missing addressPrefix without a request", async () => {
      await expect(
        resolveAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "EthWallet",
          identifier: EVM,
          addressPrefix: "",
        }),
      ).rejects.toThrow("requires a non-empty addressPrefix");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("aborts the lookup after the deadline", async () => {
      vi.useFakeTimers();
      let signal: AbortSignal | undefined;
      fetchMock.mockImplementationOnce((_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>((_, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
      });

      const pending = resolveAAApiAccountAddress({
        aaApiUrl: API,
        authenticatorType: "EthWallet",
        identifier: EVM,
        addressPrefix: "xion",
      });
      const assertion = expect(pending).rejects.toThrow(
        `AA API /address/ethwallet lookup timed out after ${AA_API_ADDRESS_LOOKUP_TIMEOUT_MS}ms`,
      );

      await vi.advanceTimersByTimeAsync(AA_API_ADDRESS_LOOKUP_TIMEOUT_MS - 1);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await assertion;
      expect(signal?.aborted).toBe(true);
    });

    it("clears the deadline timer after a successful lookup", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ address: ETH_ADDRESS, authenticator_type: "EthWallet" }),
      );

      await resolveAAApiAccountAddress({
        aaApiUrl: API,
        authenticatorType: "EthWallet",
        identifier: EVM,
        addressPrefix: "xion",
      });

      expect(vi.getTimerCount()).toBe(0);
    });

    it("does not cache lookups", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            address: ETH_ADDRESS,
            authenticator_type: "EthWallet",
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            address: ETH_ADDRESS,
            authenticator_type: "EthWallet",
          }),
        );
      const args = {
        aaApiUrl: API,
        authenticatorType: "EthWallet" as const,
        identifier: EVM,
        addressPrefix: "xion",
      };

      await resolveAAApiAccountAddress(args);
      await resolveAAApiAccountAddress(args);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("findAAApiAccountAddress (/check)", () => {
    it("returns the address of an existing EthWallet account", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          address: ETH_ADDRESS,
          codeId: 1880,
          authenticatorType: "EthWallet",
        }),
      );

      await expect(
        findAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "EthWallet",
          identifier: EVM_MIXED,
          addressPrefix: "xion",
        }),
      ).resolves.toBe(ETH_ADDRESS);
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${API}/api/v2/account/check/ethwallet/${EVM}`,
      );
    });

    it("returns the address of an existing Secp256K1 account (URL-encoded base64)", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          address: SECP_ADDRESS,
          codeId: 5,
          authenticatorType: "Secp256K1",
        }),
      );

      await expect(
        findAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "Secp256K1",
          identifier: SECP_PUBKEY_HEX,
          addressPrefix: "xion",
        }),
      ).resolves.toBe(SECP_ADDRESS);
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${API}/api/v2/account/check/secp256k1/${SECP_PUBKEY_URL}`,
      );
    });

    it("returns null only for an explicit HTTP 404", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: { message: "Account not found" } }, 404),
      );

      await expect(
        findAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "EthWallet",
          identifier: EVM,
          addressPrefix: "xion",
        }),
      ).resolves.toBeNull();
    });

    const failures: Array<{
      name: string;
      response: () => Response | Promise<never>;
      error: string;
    }> = [
      {
        name: "a non-404 error whose body says ACCOUNT_NOT_FOUND",
        response: () =>
          jsonResponse({ error: { message: "ACCOUNT_NOT_FOUND" } }, 500),
        error: "[Status]: 500",
      },
      {
        name: "502 from the indexer/RPC behind the API",
        response: () =>
          jsonResponse({ error: { message: "Bad gateway" } }, 502),
        error: "Bad gateway",
      },
      {
        name: "network error",
        response: () => Promise.reject(new TypeError("Failed to fetch")),
        error: "Failed to fetch",
      },
      {
        name: "invalid JSON",
        response: () => new Response("nope", { status: 200 }),
        error: "AA API /check/ethwallet returned invalid JSON",
      },
      {
        name: "missing codeId",
        response: () =>
          jsonResponse({
            address: ETH_ADDRESS,
            authenticatorType: "EthWallet",
          }),
        error: 'returned an invalid codeId "undefined"',
      },
      {
        name: "snake_case authenticator_type (the /address shape)",
        response: () =>
          jsonResponse({
            address: ETH_ADDRESS,
            codeId: 1880,
            authenticator_type: "EthWallet",
          }),
        error: 'returned authenticatorType "undefined"',
      },
      {
        name: "wrong authenticator type",
        response: () =>
          jsonResponse({
            address: ETH_ADDRESS,
            codeId: 1880,
            authenticatorType: "JWT",
          }),
        error: 'returned authenticatorType "JWT", expected "EthWallet"',
      },
      {
        name: "wrong prefix",
        response: () =>
          jsonResponse({
            address: WRONG_PREFIX,
            codeId: 1880,
            authenticatorType: "EthWallet",
          }),
        error: 'with prefix "cosmos"',
      },
      {
        name: "missing address",
        response: () =>
          jsonResponse({ codeId: 1880, authenticatorType: "EthWallet" }),
        error: "response is missing an address",
      },
    ];

    it.each(failures)("rejects $name", async ({ response, error }) => {
      fetchMock.mockImplementationOnce(response);

      await expect(
        findAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "EthWallet",
          identifier: EVM,
          addressPrefix: "xion",
        }),
      ).rejects.toThrow(error);
    });

    it("treats a timeout as an error, not as absence", async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}));

      const pending = findAAApiAccountAddress({
        aaApiUrl: API,
        authenticatorType: "EthWallet",
        identifier: EVM,
        addressPrefix: "xion",
      });
      const assertion = expect(pending).rejects.toThrow(
        "AA API /check/ethwallet lookup timed out after 10000ms",
      );
      await vi.advanceTimersByTimeAsync(AA_API_ADDRESS_LOOKUP_TIMEOUT_MS);
      await assertion;
    });

    it("rejects unsupported authenticator types without a request", async () => {
      await expect(
        findAAApiAccountAddress({
          aaApiUrl: API,
          authenticatorType: "Passkey",
          identifier: "credential",
          addressPrefix: "xion",
        }),
      ).rejects.toThrow('does not support authenticator type "Passkey"');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
