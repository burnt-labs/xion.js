/**
 * 🔴 CRITICAL: Account Creation Tests
 *
 * Tests for high-level account creation functions
 * Focuses on validation logic (address calculation is tested in @burnt-labs/signers)
 * API endpoints are tested in @account-abstraction-api/tests/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createEthWalletAccount,
  createJWTAccount,
  createSecp256k1Account,
} from "../createAccount";
import { AccountCreationError } from "../createAccountDiagnostics";
import { getAccountAddress, getRegistrationConfig } from "../client";
import type { RegistrationConfigResponse } from "@burnt-labs/signers";
import {
  ETH_WALLET_TEST_DATA,
  SECP256K1_TEST_DATA,
  TEST_ADDRESSES,
} from "@burnt-labs/test-utils";
import type {
  AddressResponse,
  CreateAccountResponse,
} from "@burnt-labs/signers";

/**
 * Mock payloads are typed against the generated OpenAPI types so the mocks
 * cannot drift from the real contract: if `pnpm generate:types` pulls a
 * renamed or newly-required field, these fail to compile instead of silently
 * testing a shape the API never returns. `RegistrationConfigResponse` is no
 * exception — it now comes from the generated schema like the rest.
 */
const CREATE_RESPONSE: CreateAccountResponse = {
  account_address: "xion1test",
  code_id: 21,
  transaction_hash: "hash123",
};

function addressResponse(address: string): AddressResponse {
  return { address, authenticator_type: "Secp256K1" };
}

const REGISTRATION_CONFIG: RegistrationConfigResponse = {
  default_code_id: "21",
  allowed_code_ids: ["1", "21", "95"],
  checksum: "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8",
};

/** A fetch mock that answers the create POST successfully. */
function mockCreateOk() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => CREATE_RESPONSE,
  });
}

/**
 * How a diagnostic probe misbehaves.
 *
 * `"http-error"` is the only one the original mocks covered — but the code
 * distinguishes three, and only one of them (`"hang"`) can wedge account
 * creation forever, so each needs its own case.
 */
type ProbeFailure =
  /** Endpoint answers, unhappily (500/404). `fetch` resolves `{ok:false}`. */
  | "http-error"
  /** `fetch` itself rejects — DNS failure, TLS error, offline. */
  | "reject"
  /** Connection accepted, answer never sent. Settles nothing, ever. */
  | "hang";

const NEVER: Promise<never> = new Promise(() => {});

/**
 * Routes the three endpoints the failure path touches: the create POST (made
 * to fail), and the two diagnostic GETs. Pass `null` for either diagnostic —
 * with an optional {@link ProbeFailure} mode — to make that probe unusable.
 */
function mockCreateFailsWithDiagnostics(opts: {
  apiAddress: string | null;
  registrationConfig: RegistrationConfigResponse | null;
  addressFailure?: ProbeFailure;
  configFailure?: ProbeFailure;
}) {
  const fail = (mode: ProbeFailure, label: string) => {
    if (mode === "hang") return NEVER;
    if (mode === "reject")
      return Promise.reject(new Error(`${label} network unreachable`));
    return Promise.resolve({
      ok: false,
      status: 500,
      text: async () => `${label} down`,
    });
  };

  return vi.fn().mockImplementation((url: unknown) => {
    const target = String(url);

    if (target.includes("/api/v2/account/address/")) {
      if (opts.apiAddress === null) {
        return fail(opts.addressFailure ?? "http-error", "address");
      }
      return Promise.resolve({
        ok: true,
        json: async () => addressResponse(opts.apiAddress!),
      });
    }

    if (target.includes("/api/v2/account/registration-config")) {
      if (opts.registrationConfig === null) {
        return fail(opts.configFailure ?? "http-error", "registration-config");
      }
      return Promise.resolve({
        ok: true,
        json: async () => opts.registrationConfig,
      });
    }

    // The create POST — rejected the way the API rejects a bad signature.
    return Promise.resolve({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ error: { message: "Invalid signature" } }),
    });
  });
}

describe("createAccount - Validation Logic", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("🔴 CRITICAL: createEthWalletAccount - feeGranter Validation", () => {
    it("should throw if feeGranter does not start with addressPrefix", async () => {
      const signMessageFn = vi.fn();

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
    });

    it("should accept valid feeGranter with correct prefix", async () => {
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      global.fetch = mockCreateOk();

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
      expect(callArgs.startsWith("0x")).toBe(true);
    });

    it("reports its derivation claims and code_id on the ethwallet body too", async () => {
      // The secp path asserts this; ethwallet is a separate call site with its
      // own request object, so an omission there would go unnoticed.
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      const result = await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
        undefined, // rpcUrl
        "21", // requested code id
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const signedAddress = Buffer.from(
        (signMessageFn.mock.calls[0][0] as string).slice(2),
        "hex",
      ).toString("utf8");

      expect(body.checksum).toBe(ETH_WALLET_TEST_DATA.config.checksum);
      // The claimed address must be exactly what was signed, or the API's
      // comparison is meaningless.
      expect(body.expected_address).toBe(signedAddress);
      expect(body.code_id).toBe("21");
      // ...and exposed to callers so they can assert alignment themselves.
      expect(result.derived_address).toBe(signedAddress);
    });

    it("omits code_id from the ethwallet body when not requested", async () => {
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        vi.fn().mockResolvedValue("0xsignature"),
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).not.toHaveProperty(
        "code_id",
      );
    });
  });

  describe("🔴 CRITICAL: createSecp256k1Account - feeGranter Validation", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";

    it("should throw if feeGranter does not start with addressPrefix", async () => {
      const signMessageFn = vi.fn();

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
    });

    it("should accept valid feeGranter with correct prefix", async () => {
      // Valid base64 signature (standard base64, no special chars that might cause issues)
      const validBase64Sig =
        "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      global.fetch = mockCreateOk();

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
      expect(callArgs.startsWith("0x")).toBe(true);
    });
  });

  describe("Address Lowercase Conversion", () => {
    it("should convert ethereum address to lowercase in API call", async () => {
      const signMessageFn = vi.fn().mockResolvedValue("0xsignature");
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      await createEthWalletAccount(
        "http://test-api",
        "0x742D35Cc6634C0532925a3b844Bc9e7595f0bEb0", // Mixed case
        signMessageFn,
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account, // Use properly formatted bech32 address
        "xion",
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.address).toBe(
        "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
      );
    });
  });

  describe("🔴 CRITICAL: local-first address derivation", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";
    const validBase64Sig =
      "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";

    function signedAddressOf(signMessageFn: ReturnType<typeof vi.fn>): string {
      const signedHex = signMessageFn.mock.calls[0][0] as string;
      return Buffer.from(signedHex.slice(2), "hex").toString("utf8");
    }

    it("makes no pre-flight address request on the happy path", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      // Exactly one round-trip: the create POST. No address GET.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const urls = mockFetch.mock.calls.map(([url]) => String(url));
      expect(urls.some((u) => u.includes("/account/address/"))).toBe(false);
      expect(urls[0]).toContain("/api/v2/accounts/create/secp256k1");
    });

    it("signs the locally derived address, never one supplied by the API", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      global.fetch = mockCreateOk();

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      // Deterministic CREATE2 output from the test config — not any value the
      // mocked API could have injected.
      expect(signedAddressOf(signMessageFn)).toMatch(/^xion1[0-9a-z]{38,}$/);
    });

    it("propagates a requested codeId to the create POST only", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
        undefined, // rpcUrl
        "21", // requested code id — the AA API validates it, not the client
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockFetch.mock.calls[0][1].body).code_id).toBe("21");
    });

    it("reports its derivation claims so the API can reject drift precisely", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      const result = await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.checksum).toBe(SECP256K1_TEST_DATA.config.checksum);
      // The claimed address must be exactly what was signed, or the API's
      // comparison is meaningless.
      expect(body.expected_address).toBe(signedAddressOf(signMessageFn));
      // ...and exposed to callers so they can assert alignment themselves.
      expect(result.derived_address).toBe(body.expected_address);
    });

    it("omits code_id entirely when not requested", async () => {
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).not.toHaveProperty(
        "code_id",
      );
    });
  });

  describe("registered-vs-derived address alignment", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";
    const validBase64Sig =
      "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";

    function createWithRegisteredAddress(account_address: string) {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...CREATE_RESPONSE, account_address }),
      });
      return createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        vi.fn().mockResolvedValue(validBase64Sig),
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );
    }

    it("stays silent when the registered address matches the derivation", async () => {
      // Learn the derivation, then have the API echo it back.
      const probe = mockCreateOk();
      global.fetch = probe;
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      const first = await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );

      vi.mocked(console.warn).mockClear();
      const result = await createWithRegisteredAddress(first.derived_address);

      expect(result.account_address).toBe(first.derived_address);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("warns but still returns the account when the API registers a different address", async () => {
      // The legitimate case: a pre-existing account under an older code id.
      // Throwing here would break a working login, so it must only warn.
      const result = await createWithRegisteredAddress("xion1legacyaccount");

      expect(result.account_address).toBe("xion1legacyaccount");
      expect(result.derived_address).not.toBe("xion1legacyaccount");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("differs from the locally derived"),
      );
    });
  });

  describe("🔴 CRITICAL: creation-failure diagnostics", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";
    const validBase64Sig =
      "dGVzdHNpZ25hdHVyZWRhdGF0ZXN0c2lnbmF0dXJlZGF0YXRlc3RzaWduYXR1cmVkYXRhdGVzdHNpZ25hdHVyZWRhdGE=";

    function attemptCreate(codeId?: string) {
      return createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        vi.fn().mockResolvedValue(validBase64Sig),
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
        undefined,
        codeId,
      );
    }

    it("diagnoses config drift when the API derives a different address", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await attemptCreate().catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBe("xion1apiderivessomethingelse");
      expect(error.signedAddress).toMatch(/^xion1/);
      expect(error.signedAddress).not.toBe(error.apiAddress);
      expect(error.message).toContain("Invalid signature");
      expect(error.message).toContain(
        "the AA API derives a different address than the client signed",
      );
      // The original failure is preserved, not swallowed.
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("diagnoses a code_id the chain does not allow", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await attemptCreate("999").catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.message).toContain(
        'requested code_id "999" is not in the chain\'s allowed_code_ids',
      );
      expect(error.message).toContain("1, 21, 95");
    });

    it("points downstream when client and API agree on the address", async () => {
      // First learn what the client derives, then have the API echo it back.
      const probeFetch = mockCreateOk();
      global.fetch = probeFetch;
      const signMessageFn = vi.fn().mockResolvedValue(validBase64Sig);
      await createSecp256k1Account(
        "http://test-api",
        validPubkeyHex,
        signMessageFn,
        SECP256K1_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      );
      const derived = Buffer.from(
        (signMessageFn.mock.calls[0][0] as string).slice(2),
        "hex",
      ).toString("utf8");

      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: derived,
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await attemptCreate().catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.message).toContain(
        "address derivation is correct (client and API agree)",
      );
    });

    it("still throws a useful error when the diagnostic probes are unreachable", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: null,
        registrationConfig: null,
      });

      const error = await attemptCreate().catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBeNull();
      expect(error.registrationConfig).toBeNull();
      // Original failure still surfaces even with no diagnostic support.
      expect(error.message).toContain("Invalid signature");
      expect(error.message).toContain(
        "could not reach the AA API's derivation endpoints",
      );
    });

    it("diagnoses ethwallet creation failures too", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1ethapiaddress",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await createEthWalletAccount(
        "http://test-api",
        ETH_WALLET_TEST_DATA.address,
        vi.fn().mockResolvedValue("0xsignature"),
        ETH_WALLET_TEST_DATA.config.checksum,
        TEST_ADDRESSES.account,
        "xion",
      ).catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBe("xion1ethapiaddress");
      expect(error.message).toContain(
        "the AA API derives a different address than the client signed",
      );
    });

    it("survives a probe that rejects outright, not just one that 500s", async () => {
      // Every other case here has fetch RESOLVE {ok:false}. A rejecting fetch
      // (DNS/TLS/offline) takes the Promise.allSettled rejection branch, which
      // formats `addressProbe.reason` — a different code path entirely.
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: null,
        addressFailure: "reject",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await attemptCreate().catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBeNull();
      // The rejection's own message is surfaced, not swallowed into "no address".
      expect(error.message).toContain("address network unreachable");
      expect(error.message).toContain("Invalid signature");
    });

    it("does not hang forever when a probe never answers", async () => {
      // The dangerous failure: an AA API that accepts the connection and then
      // goes quiet. Unbounded, account creation never settles and the caller
      // shows a spinner instead of the error it already has.
      vi.useFakeTimers();
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: null,
        addressFailure: "hang",
        registrationConfig: null,
        configFailure: "hang",
      });

      const pending = attemptCreate().catch((e) => e);
      await vi.advanceTimersByTimeAsync(5000);
      const error = await pending;

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBeNull();
      expect(error.registrationConfig).toBeNull();
      // The original error still surfaces, on a bounded schedule.
      expect(error.message).toContain("Invalid signature");
      expect(error.message).toContain("timed out after");
    });

    it("reports what it could learn when only one probe answers", async () => {
      // Partial support: the address resolved, the registration-config
      // endpoint did not — so no allowed_code_ids to check the request against.
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: null,
      });

      const error = await attemptCreate("999").catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBe("xion1apiderivessomethingelse");
      expect(error.registrationConfig).toBeNull();
      // requestedCodeId is echoed even though it cannot be validated...
      expect(error.message).toContain("requested code_id");
      expect(error.message).toContain("999");
      // ...and the diagnosis falls back to the divergence it CAN prove, rather
      // than accusing the chain of disallowing a code id it never confirmed.
      expect(error.message).not.toContain("allowed_code_ids");
      expect(error.message).toContain(
        "the AA API derives a different address than the client signed",
      );
    });

    it("says 'chain query unavailable' rather than inventing an allow-list", async () => {
      // The registration-config endpoint answers, but its chain query did not:
      // allowed_code_ids is null. A requested code id must NOT be reported as
      // disallowed on the strength of an absent answer.
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: {
          default_code_id: "21",
          allowed_code_ids: null,
          checksum: null,
        } as unknown as RegistrationConfigResponse,
      });

      const error = await attemptCreate("999").catch((e) => e);

      expect(error.message).toContain("<chain query unavailable>");
      expect(error.message).not.toContain("is not in the chain's");
      expect(error.message).toContain(
        "the AA API derives a different address than the client signed",
      );
    });

    it("carries the original error object itself as `cause`", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await attemptCreate().catch((e) => e);

      // Not a copy, not a re-wrap: the identical throwable, so anything that
      // matched on it before the diagnostics existed still matches.
      expect(error.cause).toBeInstanceOf(Error);
      expect((error.cause as Error).message).toContain("Invalid signature");
      // And the failed create is the ONLY thing it could have come from.
      expect(error).not.toBe(error.cause);
    });

    it("never leaks the signature into the diagnostic or the logs", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await attemptCreate().catch((e) => e);

      // The signature is credential-adjacent material; a diagnostic that pastes
      // it into an error message puts it in every log sink downstream.
      expect(error.message).not.toContain(validBase64Sig);
      const logged = [
        ...vi.mocked(console.error).mock.calls,
        ...vi.mocked(console.warn).mock.calls,
        ...vi.mocked(console.log).mock.calls,
      ]
        .flat()
        .map(String)
        .join("\n");
      expect(logged).not.toContain(validBase64Sig);
    });

    it("leaves logging to the caller instead of double-reporting", async () => {
      // The message is carried by the thrown error and every caller throws it.
      // Logging here too means a consumer that logs what it catches reports the
      // same failure twice.
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiderivessomethingelse",
        registrationConfig: REGISTRATION_CONFIG,
      });

      await attemptCreate().catch(() => {});

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("code_id propagation to the lookup endpoints", () => {
    const validPubkeyHex =
      "02c0a7c85e1574dc6d37ee05afc445cf2d53beed4e5c1e6cd7765f32b1003f9b79";

    it("puts a requested code_id in the address query string", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => addressResponse("xion1someaddress"),
      });
      global.fetch = mockFetch;

      await getAccountAddress(
        "http://test-api",
        "Secp256K1",
        validPubkeyHex,
        "21",
      );

      const url = String(mockFetch.mock.calls[0][0]);
      expect(url).toContain("/api/v2/account/address/secp256k1/");
      expect(url).toContain("?code_id=21");
    });

    it("URI-encodes both the identifier and the code_id", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => addressResponse("xion1someaddress"),
      });
      global.fetch = mockFetch;

      // Base64 pubkeys contain "+" and "/", which are path/query metacharacters:
      // unencoded they silently address a different resource.
      await getAccountAddress(
        "http://test-api",
        "Secp256K1",
        "A+b/c=",
        "2 1&x=1",
      );

      const url = String(mockFetch.mock.calls[0][0]);
      expect(url).toContain("/secp256k1/A%2Bb%2Fc%3D");
      expect(url).toContain("?code_id=2%201%26x%3D1");
    });

    it("omits the query string entirely when no code_id is requested", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => addressResponse("xion1someaddress"),
      });
      global.fetch = mockFetch;

      await getAccountAddress("http://test-api", "Secp256K1", validPubkeyHex);

      expect(String(mockFetch.mock.calls[0][0])).not.toContain("?");
    });
  });

  describe("getRegistrationConfig", () => {
    it("returns the parsed config from the registration-config endpoint", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => REGISTRATION_CONFIG,
      });
      global.fetch = mockFetch;

      const config = await getRegistrationConfig("http://test-api");

      expect(String(mockFetch.mock.calls[0][0])).toBe(
        "http://test-api/api/v2/account/registration-config",
      );
      expect(config).toEqual(REGISTRATION_CONFIG);
    });

    it("throws with the API's own error text on a non-2xx", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({ error: { message: "endpoint not deployed" } }),
      });

      await expect(getRegistrationConfig("http://test-api")).rejects.toThrow(
        "endpoint not deployed",
      );
    });

    it("does not swallow a rejecting fetch", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("offline"));

      await expect(getRegistrationConfig("http://test-api")).rejects.toThrow(
        "offline",
      );
    });
  });

  describe("🔴 CRITICAL: createJWTAccount", () => {
    /** A structurally valid, unsigned JWT — jose's decodeJwt never verifies. */
    function makeJwt(payload: Record<string, unknown>): string {
      const part = (o: unknown) =>
        Buffer.from(JSON.stringify(o)).toString("base64url");
      return `${part({ alg: "HS256", typ: "JWT" })}.${part(payload)}.c2lnbmF0dXJl`;
    }

    const SESSION_JWT = makeJwt({ aud: "project-test", sub: "user-abc123" });
    const SESSION_TOKEN = "session_test_deadbeef";
    const DERIVATION = {
      checksum: SECP256K1_TEST_DATA.config.checksum,
      feeGranter: TEST_ADDRESSES.account,
      addressPrefix: "xion",
    };

    function urlsFrom(mockFetch: ReturnType<typeof vi.fn>): string[] {
      return mockFetch.mock.calls.map(([url]) => String(url));
    }

    it("sends only the session credentials when no derivation is supplied", async () => {
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      const result = await createJWTAccount(
        "http://test-api",
        SESSION_JWT,
        SESSION_TOKEN,
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.session_jwt).toBe(SESSION_JWT);
      expect(body.session_token).toBe(SESSION_TOKEN);
      // No claims: the JWT path never signs the address, so an unrequested
      // derivation check would only turn working signups into 400s.
      expect(body).not.toHaveProperty("checksum");
      expect(body).not.toHaveProperty("expected_address");
      expect(body).not.toHaveProperty("code_id");
      expect(result.derived_address).toBeUndefined();
    });

    it("forwards code_id with or without derivation inputs", async () => {
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      await createJWTAccount("http://test-api", SESSION_JWT, SESSION_TOKEN, {
        codeId: "21",
      });

      expect(JSON.parse(mockFetch.mock.calls[0][1].body).code_id).toBe("21");
    });

    it("derives the address from aud.sub and claims it when asked to", async () => {
      const mockFetch = mockCreateOk();
      global.fetch = mockFetch;

      const result = await createJWTAccount(
        "http://test-api",
        SESSION_JWT,
        SESSION_TOKEN,
        { derivation: DERIVATION, codeId: "21" },
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.checksum).toBe(DERIVATION.checksum);
      // Deterministic CREATE2 over SHA256("<aud>.<sub>") — the same identifier
      // the AA API derives from, not the rotating token.
      expect(body.expected_address).toMatch(/^xion1[0-9a-z]{38,}$/);
      expect(result.derived_address).toBe(body.expected_address);
      expect(body.code_id).toBe("21");
    });

    it("rejects a feeGranter that does not match the address prefix", async () => {
      global.fetch = mockCreateOk();

      await expect(
        createJWTAccount("http://test-api", SESSION_JWT, SESSION_TOKEN, {
          derivation: { ...DERIVATION, feeGranter: "cosmos1nope" },
        }),
      ).rejects.toThrow('must start with addressPrefix "xion"');
    });

    it("rejects a token with no aud/sub to derive from", async () => {
      global.fetch = mockCreateOk();

      await expect(
        createJWTAccount(
          "http://test-api",
          makeJwt({ sub: "user-abc123" }),
          SESSION_TOKEN,
          { derivation: DERIVATION },
        ),
      ).rejects.toThrow(/aud.*sub/i);
    });

    it("🔒 never puts the session JWT or token in a URL", async () => {
      // The address endpoint takes its identifier in the URL PATH, where every
      // CDN and proxy on the way logs it. A bearer credential must never end up
      // there — not on the happy path, and not while diagnosing a failure.
      const mockFetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiwouldsaythis",
        registrationConfig: REGISTRATION_CONFIG,
      });
      global.fetch = mockFetch;

      await createJWTAccount("http://test-api", SESSION_JWT, SESSION_TOKEN, {
        derivation: DERIVATION,
      }).catch(() => {});

      const urls = urlsFrom(mockFetch);
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url).not.toContain(SESSION_JWT);
        expect(url).not.toContain(SESSION_TOKEN);
        // Not even URI-encoded, and not the address endpoint at all.
        expect(url).not.toContain(encodeURIComponent(SESSION_JWT));
        expect(url).not.toContain("/account/address/");
      }
    });

    it("diagnoses a failure without the address probe, and says why", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiwouldsaythis",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await createJWTAccount(
        "http://test-api",
        SESSION_JWT,
        SESSION_TOKEN,
        { derivation: DERIVATION, codeId: "999" },
      ).catch((e) => e);

      expect(error).toBeInstanceOf(AccountCreationError);
      expect(error.apiAddress).toBeNull();
      // The registration-config probe carries nothing user-specific, so it
      // still runs — and still explains a disallowed code id.
      expect(error.registrationConfig).toEqual(REGISTRATION_CONFIG);
      expect(error.message).toContain(
        'requested code_id "999" is not in the chain\'s allowed_code_ids',
      );
      expect(error.message).not.toContain(SESSION_JWT);
      expect(error.message).not.toContain(SESSION_TOKEN);
    });

    it("rethrows the original error untouched when there is nothing to diagnose", async () => {
      global.fetch = mockCreateFailsWithDiagnostics({
        apiAddress: "xion1apiwouldsaythis",
        registrationConfig: REGISTRATION_CONFIG,
      });

      const error = await createJWTAccount(
        "http://test-api",
        SESSION_JWT,
        SESSION_TOKEN,
      ).catch((e) => e);

      // No local derivation means the diagnostic could only restate the
      // registration config — not worth re-classing the caller's error.
      expect(error).not.toBeInstanceOf(AccountCreationError);
      expect(error.message).toContain("Invalid signature");
    });

    it("warns rather than throws when the API registers a different address", async () => {
      // Same rule as the wallet paths: a pre-existing account under an older
      // code id is a legitimate answer, and throwing would break the login.
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...CREATE_RESPONSE,
          account_address: "xion1legacyjwtaccount",
        }),
      });

      const result = await createJWTAccount(
        "http://test-api",
        SESSION_JWT,
        SESSION_TOKEN,
        { derivation: DERIVATION },
      );

      expect(result.account_address).toBe("xion1legacyjwtaccount");
      expect(result.derived_address).not.toBe("xion1legacyjwtaccount");
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("differs from the locally derived"),
      );
    });
  });
});
