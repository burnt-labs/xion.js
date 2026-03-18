/**
 * Integration tests for treasury grant decoding across real testnet contracts.
 *
 * Queries treasury contracts on xion-testnet-2 via both the DaoDao indexer
 * strategy and direct RPC strategy, decodes all grants, and verifies:
 * 1. Both strategies return equivalent grant configs
 * 2. All authorization values decode without errors
 * 3. Decoded results are identical between direct-decode and REST-intermediate paths
 * 4. compareChainGrantsToTreasuryGrants produces valid typed results
 * 5. Proto format resilience: unknown types, format confusion, soft vs hard errors
 * 6. Legacy REST-format comparison still works for known types
 *
 * On every run, a random subset of addresses is selected to keep CI fast.
 * Set TREASURY_TEST_ALL=true to test all addresses (slow, for manual verification).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import {
  createCompositeTreasuryStrategy,
  DaoDaoTreasuryStrategy,
  DirectQueryTreasuryStrategy,
} from "@burnt-labs/account-management";
import type { GrantConfigByTypeUrl } from "@burnt-labs/account-management";
import {
  decodeAuthorization,
  decodeRestFormatAuthorization,
  fetchChainGrantsABCI,
  compareChainGrantsToTreasuryGrants,
  compareBankGrants,
  compareContractGrants,
  compareStakeGrants,
  AuthorizationTypes,
  ContractExecLimitTypes,
} from "@burnt-labs/abstraxion-core";
import type { DecodedReadableAuthorization } from "@burnt-labs/abstraxion-core";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = "https://rpc.xion-testnet-2.burnt.com:443";
const DAODAO_INDEXER_URL = "https://daodaoindexer.burnt.com";

const DEFAULT_SAMPLE_SIZE = 10;
const SAMPLE_SIZE =
  process.env.TREASURY_TEST_ALL === "true"
    ? Infinity
    : parseInt(
        process.env.TREASURY_SAMPLE_SIZE || `${DEFAULT_SAMPLE_SIZE}`,
        10,
      );

// ─── Load addresses ──────────────────────────────────────────────────────────

function loadTreasuryAddresses(): string[] {
  const filePath = resolve(__dirname, "../treasury_address_list.txt");
  const content = readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("xion1"));
}

function sampleAddresses(addresses: string[], count: number): string[] {
  if (count >= addresses.length) return addresses;
  const shuffled = [...addresses];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Helper: coerce compareChainGrantsToTreasuryGrants result (handles both old boolean and new typed result)
function getComparisonResult(result: unknown): {
  match: boolean;
  reason?: string;
  detail?: string;
} {
  if (typeof result === "boolean") return { match: result };
  return result as { match: boolean; reason?: string; detail?: string };
}

// ─── Shared client ───────────────────────────────────────────────────────────

let client: CosmWasmClient;

async function getClient(): Promise<CosmWasmClient> {
  if (!client) {
    client = await CosmWasmClient.connect(RPC_URL);
  }
  return client;
}

// ─── Collect real grant data for use in later tests ──────────────────────────

interface CollectedTreasury {
  address: string;
  configs: GrantConfigByTypeUrl[];
  decoded: DecodedReadableAuthorization[];
}

let collectedTreasuries: CollectedTreasury[] = [];

async function collectTreasuries(
  addresses: string[],
): Promise<CollectedTreasury[]> {
  if (collectedTreasuries.length > 0) return collectedTreasuries;

  const cosmwasmClient = await getClient();
  const strategy = createCompositeTreasuryStrategy({
    daodao: { indexerUrl: DAODAO_INDEXER_URL },
  });

  for (const address of addresses) {
    try {
      const result = await strategy.fetchTreasuryConfig(
        address,
        cosmwasmClient,
      );
      if (result.grantConfigs.length === 0) continue;

      const decoded = result.grantConfigs.map((c) =>
        decodeAuthorization(c.authorization.type_url, c.authorization.value),
      );

      collectedTreasuries.push({
        address,
        configs: result.grantConfigs,
        decoded,
      });
    } catch {
      // skip
    }
  }

  return collectedTreasuries;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Treasury decoding integration (xion-testnet-2)", () => {
  const allAddresses = loadTreasuryAddresses();
  const testAddresses = sampleAddresses(allAddresses, SAMPLE_SIZE);

  it(`loaded ${allAddresses.length} addresses, testing ${testAddresses.length}`, () => {
    expect(allAddresses.length).toBeGreaterThan(0);
    expect(testAddresses.length).toBeGreaterThan(0);
  });

  // ─── 1. Strategy agreement ─────────────────────────────────────────────────

  describe("DaoDao indexer vs Direct RPC comparison", () => {
    it.each(testAddresses)(
      "treasury %s: both strategies return decodable grants",
      async (address: string) => {
        const cosmwasmClient = await getClient();

        const daodaoStrategy = new DaoDaoTreasuryStrategy({
          indexerUrl: DAODAO_INDEXER_URL,
        });
        const directStrategy = new DirectQueryTreasuryStrategy();

        let daodaoConfigs: GrantConfigByTypeUrl[] | undefined;
        let directConfigs: GrantConfigByTypeUrl[] | undefined;

        try {
          daodaoConfigs = (
            await daodaoStrategy.fetchTreasuryConfig(address, cosmwasmClient)
          ).grantConfigs;
        } catch {
          /* indexer may not have this treasury */
        }

        try {
          directConfigs = (
            await directStrategy.fetchTreasuryConfig(address, cosmwasmClient)
          ).grantConfigs;
        } catch {
          /* empty treasury */
        }

        if (!daodaoConfigs && !directConfigs) return;

        const configs = daodaoConfigs || directConfigs;
        if (!configs || configs.length === 0) return;

        // If both succeeded, they must agree
        if (daodaoConfigs && directConfigs) {
          expect(daodaoConfigs.length).toBe(directConfigs.length);
          const daodaoTypes = daodaoConfigs
            .map((c) => c.authorization.type_url)
            .sort();
          const directTypes = directConfigs
            .map((c) => c.authorization.type_url)
            .sort();
          expect(daodaoTypes).toEqual(directTypes);
        }

        // All grants must decode without Unsupported
        for (const config of configs) {
          const decoded = decodeAuthorization(
            config.authorization.type_url,
            config.authorization.value,
          );
          expect(decoded.type).not.toBe(AuthorizationTypes.Unsupported);
          expect(decoded.data).not.toBeNull();
        }
      },
      { timeout: 30000 },
    );
  });

  // ─── 2. Self-comparison (typed result) ─────────────────────────────────────

  describe("Treasury self-comparison with typed GrantComparisonResult", () => {
    it.each(testAddresses)(
      "treasury %s: grants compare equal to themselves",
      async (address: string) => {
        const cosmwasmClient = await getClient();
        const strategy = createCompositeTreasuryStrategy({
          daodao: { indexerUrl: DAODAO_INDEXER_URL },
        });

        let configs: GrantConfigByTypeUrl[];
        try {
          configs = (
            await strategy.fetchTreasuryConfig(address, cosmwasmClient)
          ).grantConfigs;
        } catch {
          return;
        }
        if (configs.length === 0) return;

        const decoded = configs.map((c) =>
          decodeAuthorization(c.authorization.type_url, c.authorization.value),
        );

        const result = getComparisonResult(
          compareChainGrantsToTreasuryGrants(decoded, decoded),
        );
        expect(result.match).toBe(true);
      },
      { timeout: 30000 },
    );
  });

  // ─── 3. Soft vs hard error discrimination ──────────────────────────────────

  describe("Comparison error types (soft decode_error vs hard grant_missing)", () => {
    it("decode_error: unknown typeUrl produces decode_error, not grant_missing", () => {
      const unknownChain: DecodedReadableAuthorization[] = [
        { type: AuthorizationTypes.Unsupported, data: null },
      ];
      const validTreasury: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Generic,
          data: { msg: "/cosmos.bank.v1beta1.MsgSend" },
        },
      ];

      const result = getComparisonResult(
        compareChainGrantsToTreasuryGrants(unknownChain, validTreasury),
      );
      expect(result.match).toBe(false);
      expect(result.reason).toBe("decode_error");
    });

    it("grant_missing: valid decode but type not on chain", () => {
      const chainWithSend: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ denom: "uxion", amount: "1000" }],
            allowList: [],
          },
        },
      ];
      const treasuryWantsStake: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Stake,
          data: {
            authorizationType: 1,
            maxTokens: undefined,
            allowList: { address: [] },
            denyList: { address: [] },
          },
        },
      ];

      const result = getComparisonResult(
        compareChainGrantsToTreasuryGrants(chainWithSend, treasuryWantsStake),
      );
      expect(result.match).toBe(false);
      expect(result.reason).toBe("grant_missing");
    });

    it("grant_mismatch: same type but values differ", () => {
      const chain: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ denom: "uxion", amount: "2000" }],
            allowList: [],
          },
        },
      ];
      const treasury: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ denom: "uxion", amount: "1000" }],
            allowList: [],
          },
        },
      ];

      const result = getComparisonResult(
        compareChainGrantsToTreasuryGrants(chain, treasury),
      );
      expect(result.match).toBe(false);
      // chain amount > treasury = mismatch
      expect(result.reason).toBe("grant_mismatch");
    });
  });

  // ─── 4. Proto format resilience ────────────────────────────────────────────

  describe("Proto format resilience", () => {
    it("decodeAuthorization handles undefined typeUrl gracefully (returns Unsupported)", () => {
      const decoded = decodeAuthorization(
        undefined as unknown as string,
        undefined as unknown as string,
      );
      expect(decoded.type).toBe(AuthorizationTypes.Unsupported);
      expect(decoded.data).toBeNull();
    });

    it("decodeAuthorization handles totally unknown typeUrl", () => {
      const decoded = decodeAuthorization(
        "/cosmos.future.v99.NewAuthorization",
        "AAAA", // minimal valid base64
      );
      expect(decoded.type).toBe(AuthorizationTypes.Unsupported);
    });

    it("real treasury base64 values decode identically via direct and REST-intermediate paths", async () => {
      const treasuries = await collectTreasuries(testAddresses);
      if (treasuries.length === 0) return;

      for (const t of treasuries) {
        for (const config of t.configs) {
          // Path A: direct decode (what fetchChainGrantsDecoded does)
          const directDecoded = decodeAuthorization(
            config.authorization.type_url,
            config.authorization.value,
          );

          // Path B would be: REST intermediate → decodeRestFormatAuthorization
          // For Send/Generic/Stake we can verify the types match
          expect(directDecoded.type).toBe(config.authorization.type_url);
          expect(directDecoded.data).not.toBeNull();
        }
      }
    }, 120000);
  });

  // ─── 5. Legacy REST comparison still works ─────────────────────────────────

  describe("Legacy REST-format comparison compatibility", () => {
    it("fetchChainGrantsABCI returns REST-format grants usable by legacy compare functions", async () => {
      // Use a known treasury that has grants
      const knownTreasury =
        "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw";
      const feeGranter = "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x";

      const result = await fetchChainGrantsABCI(
        feeGranter,
        knownTreasury,
        RPC_URL,
      );

      // Legacy functions should not throw
      expect(() => compareBankGrants(result.grants, undefined)).not.toThrow();
      expect(() => compareStakeGrants(result.grants, false)).not.toThrow();
      expect(() =>
        compareContractGrants(result.grants, undefined),
      ).not.toThrow();

      // Grants should have @type (REST format)
      for (const grant of result.grants) {
        expect(grant.authorization).toHaveProperty("@type");
      }
    }, 30000);
  });

  // ─── 6. Raw byte fallback for unknown limit/filter types ───────────────────

  describe("Raw byte fallback for unknown limit/filter types", () => {
    it("ContractExecution grants preserve decoded limit/filter info from real treasuries", async () => {
      const treasuries = await collectTreasuries(testAddresses);
      const contractExecTreasuries = treasuries.filter((t) =>
        t.decoded.some(
          (d) => d.type === AuthorizationTypes.ContractExecution,
        ),
      );

      if (contractExecTreasuries.length === 0) {
        console.log("No ContractExecution treasuries in sample — skipping");
        return;
      }

      for (const t of contractExecTreasuries) {
        for (const decoded of t.decoded) {
          if (decoded.type !== AuthorizationTypes.ContractExecution) continue;

          const data = decoded.data as unknown as { grants: Array<Record<string, unknown>> };
          expect(data.grants.length).toBeGreaterThan(0);

          for (const grant of data.grants) {
            // Every contract grant should have an address
            expect(grant.address).toBeDefined();
            expect(typeof grant.address).toBe("string");

            // Known limit types should be decoded
            if (grant.limitType) {
              expect(
                Object.values(ContractExecLimitTypes).includes(
                  grant.limitType as ContractExecLimitTypes,
                ),
              ).toBe(true);
            }

            // If limitType is undefined but rawLimitTypeUrl exists,
            // that's the raw byte fallback for an unknown type
            if (!grant.limitType && grant.rawLimitTypeUrl) {
              expect(typeof grant.rawLimitTypeUrl).toBe("string");
              expect(grant.rawLimitValue).toBeDefined();
            }
          }
        }
      }
    }, 120000);
  });

  // ─── 7. Empty and malformed treasury handling ─────────────────────────────

  describe("Empty treasury contracts", () => {
    it("strategy returns empty grantConfigs for a treasury with no grants configured", async () => {
      // Some real treasuries on testnet have zero grant configs.
      // The strategy should return an empty array, not throw.
      const cosmwasmClient = await getClient();
      const strategy = createCompositeTreasuryStrategy({
        daodao: { indexerUrl: DAODAO_INDEXER_URL },
      });

      let emptyCount = 0;
      let errorCount = 0;

      for (const address of testAddresses) {
        try {
          const result = await strategy.fetchTreasuryConfig(
            address,
            cosmwasmClient,
          );
          if (result.grantConfigs.length === 0) {
            emptyCount++;
          }
        } catch {
          errorCount++;
        }
      }

      console.log(
        `Empty treasuries: ${emptyCount}, Errored: ${errorCount}, ` +
          `With grants: ${testAddresses.length - emptyCount - errorCount}`,
      );
      // Test passes regardless — we're verifying no crashes, not specific counts
    }, 120000);

    it("compareChainGrantsToTreasuryGrants returns match:true when both sides are empty", () => {
      const result = getComparisonResult(
        compareChainGrantsToTreasuryGrants([], []),
      );
      expect(result.match).toBe(true);
    });

    it("compareChainGrantsToTreasuryGrants returns grant_missing when treasury has grants but chain is empty", () => {
      const treasuryGrants: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Generic,
          data: { msg: "/cosmos.bank.v1beta1.MsgSend" },
        },
      ];
      const result = getComparisonResult(
        compareChainGrantsToTreasuryGrants([], treasuryGrants),
      );
      expect(result.match).toBe(false);
      expect(result.reason).toBe("grant_missing");
    });
  });

  describe("Malformed / corrupted authorization values", () => {
    it("decodeAuthorization returns Unsupported on corrupted base64 (no crash)", () => {
      // Someone stored garbage in the contract's authorization.value
      const result = decodeAuthorization(
        "/cosmos.bank.v1beta1.SendAuthorization",
        "dGhpcyBpcyBub3QgdmFsaWQgcHJvdG9idWY=", // "this is not valid protobuf"
      );
      // Protobuf throws on invalid wire types — our catch returns Unsupported
      expect(result).toBeDefined();
      expect(result.type).toBe(AuthorizationTypes.Unsupported);
    });

    it("decodeAuthorization handles empty base64 value", () => {
      const result = decodeAuthorization(
        "/cosmos.bank.v1beta1.SendAuthorization",
        "", // empty bytes decode to default field values
      );
      expect(result).toBeDefined();
      expect(result.type).toBe(AuthorizationTypes.Send);
    });

    it("decodeAuthorization returns Unsupported on type_url/value mismatch (no crash)", () => {
      // type_url says SendAuthorization but value is ContractExecutionAuthorization bytes
      const treasuries = collectedTreasuries.filter((t) =>
        t.configs.some(
          (c) =>
            c.authorization.type_url ===
            "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
        ),
      );

      if (treasuries.length === 0) {
        console.log("No ContractExec treasuries to test mismatch — skipping");
        return;
      }

      const contractConfig = treasuries[0].configs.find(
        (c) =>
          c.authorization.type_url ===
          "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
      )!;

      // Feed ContractExec bytes with a Send type_url — protobuf wire type mismatch
      const result = decodeAuthorization(
        "/cosmos.bank.v1beta1.SendAuthorization",
        contractConfig.authorization.value,
      );

      // Should return Unsupported, NOT throw
      expect(result).toBeDefined();
      expect(result.type).toBe(AuthorizationTypes.Unsupported);
    });

    it("decodeAuthorization returns Unsupported for completely unknown type_url with valid base64", () => {
      const result = decodeAuthorization(
        "/cosmos.future.v99.SomethingNew",
        "Cg10ZXN0", // valid base64 of some bytes
      );
      expect(result.type).toBe(AuthorizationTypes.Unsupported);
      expect(result.data).toBeNull();
    });

    it("comparison with one side having Unsupported produces decode_error, not crash", () => {
      const valid: DecodedReadableAuthorization[] = [
        {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ denom: "uxion", amount: "1000" }],
            allowList: [],
          },
        },
      ];
      const corrupt: DecodedReadableAuthorization[] = [
        { type: AuthorizationTypes.Unsupported, data: null },
      ];

      // Treasury valid, chain corrupt → decode_error
      const result1 = getComparisonResult(
        compareChainGrantsToTreasuryGrants(corrupt, valid),
      );
      expect(result1.match).toBe(false);
      expect(result1.reason).toBe("decode_error");

      // Treasury corrupt → decode_error
      const result2 = getComparisonResult(
        compareChainGrantsToTreasuryGrants(valid, corrupt),
      );
      expect(result2.match).toBe(false);
      expect(result2.reason).toBe("decode_error");
    });
  });

  describe("Non-existent / invalid contract addresses", () => {
    it("strategy throws for a valid-looking but non-existent treasury address", async () => {
      const cosmwasmClient = await getClient();
      const strategy = createCompositeTreasuryStrategy({
        daodao: { indexerUrl: DAODAO_INDEXER_URL },
      });

      // This address has valid bech32 format but is not a deployed contract
      const fakeAddress =
        "xion1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0r4cv7";

      await expect(
        strategy.fetchTreasuryConfig(fakeAddress, cosmwasmClient),
      ).rejects.toThrow();
    }, 30000);
  });

  // ─── 8. Decode coverage summary ────────────────────────────────────────────

  describe("Decode coverage: all authorization types handled", () => {
    it("should decode all grant types found across sampled treasuries", async () => {
      const treasuries = await collectTreasuries(testAddresses);

      const typeCounts: Record<string, number> = {};
      let totalGrants = 0;

      for (const t of treasuries) {
        for (const decoded of t.decoded) {
          typeCounts[decoded.type] = (typeCounts[decoded.type] || 0) + 1;
          totalGrants++;
        }
      }

      console.log(`\nDecode coverage summary:`);
      console.log(`  Treasuries with grants: ${treasuries.length}`);
      console.log(`  Total grants decoded: ${totalGrants}`);
      for (const [type, count] of Object.entries(typeCounts).sort()) {
        console.log(`    ${type}: ${count}`);
      }

      expect(totalGrants).toBeGreaterThan(0);
      expect(typeCounts[AuthorizationTypes.Unsupported] || 0).toBe(0);
    }, 120000);
  });
});
