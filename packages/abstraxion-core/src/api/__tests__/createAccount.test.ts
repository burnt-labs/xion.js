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
  createSecp256k1Account,
} from "../createAccount";
import { AccountCreationError } from "../createAccountDiagnostics";
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
 * testing a shape the API never returns.
 *
 * `RegistrationConfigResponse` is the one exception — that endpoint is not in
 * the deployed schema yet, so it is anchored to the hand-written interface in
 * client.ts until the generated types catch up.
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
 * Routes the three endpoints the failure path touches: the create POST (made
 * to fail), and the two diagnostic GETs. Pass `null` for either diagnostic to
 * make that probe unreachable.
 */
function mockCreateFailsWithDiagnostics(opts: {
  apiAddress: string | null;
  registrationConfig: RegistrationConfigResponse | null;
}) {
  return vi.fn().mockImplementation(async (url: unknown) => {
    const target = String(url);

    if (target.includes("/api/v2/account/address/")) {
      if (opts.apiAddress === null) {
        return { ok: false, status: 500, text: async () => "address down" };
      }
      return { ok: true, json: async () => addressResponse(opts.apiAddress!) };
    }

    if (target.includes("/api/v2/account/registration-config")) {
      if (opts.registrationConfig === null) {
        return { ok: false, status: 404, text: async () => "not deployed" };
      }
      return { ok: true, json: async () => opts.registrationConfig };
    }

    // The create POST — rejected the way the API rejects a bad signature.
    return {
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ error: { message: "Invalid signature" } }),
    };
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
  });
});
