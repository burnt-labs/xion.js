/**
 * Chain-resolved smart account address derivation.
 *
 * Fixtures are real ABCI responses captured from xion-testnet-2 and
 * xion-mainnet-1 (xion v31.0.0) on 2026-10-03.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fromBase64 } from "@cosmjs/encoding";
import {
  ABSTRACT_ACCOUNT_PARAMS_PATH,
  WASM_CODE_INFO_PATH,
  AddressDerivationMismatchError,
  clearAddressDerivationCache,
  decodeAbstractAccountParams,
  decodeCodeInfoChecksum,
  resolveAddressDerivation,
  resolveSmartAccountChecksum,
  type AbciQueryFn,
} from "../addressDerivation";

const TESTNET_HASH =
  "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8";
const MAINNET_HASH =
  "FEFA4D0C57F6CA47A5D89C6F077A176D26027DB4EEFA758A929DD4C4AAF17D1B";
const CODE_1880_CHECKSUM =
  "D27A379FF65EB47A9E538E3A3D46101DE2A6C0B86BA3D0BF014C0403849414E6";
const CODE_21_CHECKSUM =
  "D60581309EADF27A366F35EEFFE364C40CE49F0BB4165A5AD03C1104983BF82F";
const CODE_95_CHECKSUM =
  "2B762F3AC65381F39DFF37E08F5A0CCD7AB0E6C72E33CF4636F2261136F329BC";

/** abstractaccount.v1.Query/Params on xion-testnet-2 */
const TESTNET_PARAMS = fromBase64(
  "CjUSBQEVX9gOGMCWsQIgwJaxAjgBQiD8BvAiyVFy9UrQW8ByFPUFcs32hEWerdT1inZVJFZ9uA==",
);
/** abstractaccount.v1.Query/Params on xion-mainnet-1 */
const MAINNET_PARAMS = fromBase64(
  "CjISAgU3GMCWsQIgwJaxAjgBQiD++k0MV/bKR6XYnG8HehdtJgJ9tO76dYqSndTEqvF9Gw==",
);
/** Pre-v31 params: no address_derivation_hash, registration disabled */
const UNCONFIGURED_PARAMS = new Uint8Array([
  0x0a, 0x04, 0x12, 0x02, 0x01, 0x15,
]);

/** cosmwasm.wasm.v1.Query/CodeInfo on xion-testnet-2, keyed by code id */
const TESTNET_CODE_INFO: Record<number, Uint8Array> = {
  1: fromBase64(
    "CAESK3hpb24xeHJxejJ3cHQ0cnc4cnRkdnJjNG40eW41aDU0am0wbm40ZXZuMngaIPwG8CLJUXL1StBbwHIU9QVyzfaERZ6t1PWKdlUkVn24IgIIAw==",
  ),
  21: fromBase64(
    "CBUSK3hpb24xNGNsMmR0aHFhbWd1Y2c5c2Z2djRyZWxwM2FhODNlNDBobjd0ajQaINYFgTCerfJ6Nm817v/jZMQM5J8LtBZaWtA8EQSYO/gvIgIIAw==",
  ),
  95: fromBase64(
    "CF8SK3hpb24xNGNsMmR0aHFhbWd1Y2c5c2Z2djRyZWxwM2FhODNlNDBobjd0ajQaICt2LzrGU4Hznf834I9aDM16sObHLjPPRjbyJhE28ym8IgIIAw==",
  ),
  1880: fromBase64(
    "CNgOEit4aW9uMTZrcThqNGxlNnpqdGhjNWtodzV3M2x4N21xNXEyeTlzajBxemU0GiDSejef9l60ep5Tjjo9RhAd4qbAuGuj0L8BTAQDhJQU5iICCAM=",
  ),
};

function decodeCodeIdRequest(data: Uint8Array): number {
  // field 1 varint
  let id = 0;
  let shift = 0;
  for (let i = 1; i < data.length; i++) {
    id += (data[i] & 0x7f) * 2 ** shift;
    shift += 7;
  }
  return id;
}

function testnetQuery(): AbciQueryFn {
  return vi.fn(async (path: string, data: Uint8Array) => {
    if (path === ABSTRACT_ACCOUNT_PARAMS_PATH) return TESTNET_PARAMS;
    if (path === WASM_CODE_INFO_PATH) {
      const info = TESTNET_CODE_INFO[decodeCodeIdRequest(data)];
      if (!info) throw new Error("not found");
      return info;
    }
    throw new Error(`unexpected path ${path}`);
  });
}

describe("addressDerivation", () => {
  beforeEach(() => {
    clearAddressDerivationCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("decodeAbstractAccountParams", () => {
    it("decodes xion-testnet-2 params", () => {
      expect(decodeAbstractAccountParams(TESTNET_PARAMS)).toEqual({
        addressDerivationHash: TESTNET_HASH,
        allowedCodeIds: [1, 21, 95, 1880],
        allowAllCodeIds: false,
        registrationEnabled: true,
      });
    });

    it("decodes xion-mainnet-1 params", () => {
      expect(decodeAbstractAccountParams(MAINNET_PARAMS)).toEqual({
        addressDerivationHash: MAINNET_HASH,
        allowedCodeIds: [5, 55],
        allowAllCodeIds: false,
        registrationEnabled: true,
      });
    });

    it("returns a null hash for pre-v31 params", () => {
      expect(
        decodeAbstractAccountParams(UNCONFIGURED_PARAMS).addressDerivationHash,
      ).toBeNull();
    });
  });

  describe("decodeCodeInfoChecksum", () => {
    it("decodes code checksums", () => {
      expect(decodeCodeInfoChecksum(TESTNET_CODE_INFO[1880])).toBe(
        CODE_1880_CHECKSUM,
      );
      expect(decodeCodeInfoChecksum(TESTNET_CODE_INFO[1])).toBe(TESTNET_HASH);
    });
  });

  describe("resolveAddressDerivation", () => {
    it("reads the checksum from the chain and lists legacy code checksums", async () => {
      const result = await resolveAddressDerivation({
        chainId: "xion-testnet-2",
        query: testnetQuery(),
      });

      expect(result.checksum).toBe(TESTNET_HASH);
      expect(result.source).toBe("chain");
      // Code 1's data_hash equals the derivation hash, so it is not repeated
      expect(result.legacyChecksums).toEqual([
        CODE_21_CHECKSUM,
        CODE_95_CHECKSUM,
        CODE_1880_CHECKSUM,
      ]);
    });

    it("caches the chain read per chain id", async () => {
      const query = testnetQuery();
      await resolveAddressDerivation({ chainId: "xion-testnet-2", query });
      const callsAfterFirst = vi.mocked(query).mock.calls.length;
      await resolveAddressDerivation({ chainId: "xion-testnet-2", query });
      await resolveSmartAccountChecksum({ chainId: "xion-testnet-2", query });

      expect(vi.mocked(query).mock.calls.length).toBe(callsAfterFirst);
      expect(
        vi
          .mocked(query)
          .mock.calls.filter(([p]) => p === ABSTRACT_ACCOUNT_PARAMS_PATH),
      ).toHaveLength(1);

      // A different chain id is resolved separately
      const mainnetQuery: AbciQueryFn = vi.fn(async () => MAINNET_PARAMS);
      await expect(
        resolveSmartAccountChecksum({
          chainId: "xion-mainnet-1",
          query: mainnetQuery,
        }),
      ).resolves.toBe(MAINNET_HASH);
    });

    it("shares one in-flight read between concurrent callers", async () => {
      const query = testnetQuery();
      await Promise.all([
        resolveAddressDerivation({ chainId: "xion-testnet-2", query }),
        resolveAddressDerivation({ chainId: "xion-testnet-2", query }),
      ]);
      expect(
        vi
          .mocked(query)
          .mock.calls.filter(([p]) => p === ABSTRACT_ACCOUNT_PARAMS_PATH),
      ).toHaveLength(1);
    });

    it("accepts a pin that matches the chain, in any case or with 0x", async () => {
      await expect(
        resolveSmartAccountChecksum({
          chainId: "xion-testnet-2",
          query: testnetQuery(),
          pinnedChecksum: `0x${TESTNET_HASH.toLowerCase()}`,
        }),
      ).resolves.toBe(TESTNET_HASH);
    });

    it("fails loudly when the pin disagrees with the chain", async () => {
      const promise = resolveAddressDerivation({
        chainId: "xion-testnet-2",
        query: testnetQuery(),
        pinnedChecksum: CODE_1880_CHECKSUM,
      });

      await expect(promise).rejects.toBeInstanceOf(
        AddressDerivationMismatchError,
      );
      await expect(promise).rejects.toMatchObject({
        pinnedChecksum: CODE_1880_CHECKSUM,
        chainChecksum: TESTNET_HASH,
        chainId: "xion-testnet-2",
      });
      await expect(promise).rejects.toThrow(/does not match/);
    });

    it("uses the pin when the chain has no derivation hash (pre-v31)", async () => {
      const result = await resolveAddressDerivation({
        chainId: "localnet",
        query: vi.fn(async () => UNCONFIGURED_PARAMS),
        pinnedChecksum: CODE_1880_CHECKSUM,
      });
      expect(result).toEqual({
        checksum: CODE_1880_CHECKSUM,
        source: "pin",
        legacyChecksums: [],
      });
    });

    it("throws when the chain has no derivation hash and there is no pin", async () => {
      await expect(
        resolveAddressDerivation({
          chainId: "localnet",
          query: vi.fn(async () => UNCONFIGURED_PARAMS),
        }),
      ).rejects.toThrow(/no x\/abstractaccount address_derivation_hash/);
    });

    it("falls back to the pin when the chain is unreachable, without caching the failure", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const failing: AbciQueryFn = vi.fn(async () => {
        throw new Error("connection refused");
      });

      await expect(
        resolveSmartAccountChecksum({
          chainId: "xion-testnet-2",
          query: failing,
          pinnedChecksum: TESTNET_HASH,
        }),
      ).resolves.toBe(TESTNET_HASH);
      expect(console.warn).toHaveBeenCalled();

      // Next call retries the chain
      const query = testnetQuery();
      const result = await resolveAddressDerivation({
        chainId: "xion-testnet-2",
        query,
      });
      expect(result.source).toBe("chain");
    });

    it("rethrows when the chain is unreachable and there is no pin", async () => {
      await expect(
        resolveAddressDerivation({
          chainId: "xion-testnet-2",
          query: vi.fn(async () => {
            throw new Error("connection refused");
          }),
        }),
      ).rejects.toThrow(/connection refused/);
    });

    it("skips a legacy code whose info cannot be read", async () => {
      const query: AbciQueryFn = vi.fn(async (path, data) => {
        if (path === ABSTRACT_ACCOUNT_PARAMS_PATH) return TESTNET_PARAMS;
        const id = decodeCodeIdRequest(data);
        if (id === 21) throw new Error("boom");
        return TESTNET_CODE_INFO[id];
      });
      const result = await resolveAddressDerivation({
        chainId: "xion-testnet-2",
        query,
      });
      expect(result.legacyChecksums).toEqual([
        CODE_95_CHECKSUM,
        CODE_1880_CHECKSUM,
      ]);

      // The incomplete result is not cached: the next call retries and
      // picks up the code that failed before
      const retry = await resolveAddressDerivation({
        chainId: "xion-testnet-2",
        query: testnetQuery(),
      });
      expect(retry.legacyChecksums).toEqual([
        CODE_21_CHECKSUM,
        CODE_95_CHECKSUM,
        CODE_1880_CHECKSUM,
      ]);
    });

    it("keys the cache by chain id and RPC URL", async () => {
      await resolveAddressDerivation({
        chainId: "xion-testnet-2",
        rpcUrl: "https://rpc-a.example",
        query: testnetQuery(),
      });

      const other: AbciQueryFn = vi.fn(async () => MAINNET_PARAMS);
      const result = await resolveAddressDerivation({
        chainId: "xion-testnet-2",
        rpcUrl: "https://rpc-b.example",
        query: other,
      });

      expect(other).toHaveBeenCalled();
      expect(result.checksum).toBe(MAINNET_HASH);
    });

    it("uses the pin as-is when there is no RPC to read", async () => {
      await expect(
        resolveSmartAccountChecksum({ pinnedChecksum: TESTNET_HASH }),
      ).resolves.toBe(TESTNET_HASH);
      await expect(resolveSmartAccountChecksum({})).rejects.toThrow(
        /no rpcUrl/,
      );
    });
  });
});
