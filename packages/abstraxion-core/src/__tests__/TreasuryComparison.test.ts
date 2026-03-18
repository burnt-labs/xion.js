/**
 * Tests for treasury grant comparison after ABCI query.
 *
 * Verifies the fix for the bug where fetchChainGrantsABCI returns grants in
 * REST format (@type keys) but compareGrantsToTreasuryWithConfigs needs raw
 * protobuf fields (typeUrl + value) to re-decode. The fix preserves both
 * formats on each grant.
 *
 * ALL base64 authorization values below are copied verbatim from real treasury
 * contracts on xion-testnet-2 (code ID 1260, queried 2026-03-12).
 *
 * Real treasury patterns found across 50 deployed contracts:
 *
 * 1. Bank + ContractExec(MaxCallsLimit)  — xion1sv6kd… (known testnet treasury)
 * 2. Bank + ContractExec(MaxFundsLimit, IBC denom) — xion1fqum4… (invoice platform)
 * 3. Bank only                           — xion1x4zc9… (sample)
 * 4. ContractExec only (single, MaxFundsLimit uxion)   — xion109k30… (MemoryCapsule)
 * 5. ContractExec only (multi, MaxFundsLimit uxion)    — xion1t3vjr… (UserMap + RUM)
 * 6. Bank(factory token) + ContractExec(MaxFundsLimit) — xion174jza… (custom token)
 */

import { describe, it, expect } from "vitest";
import { toByteArray } from "base64-js";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import type { GrantsResponse, TreasuryGrantConfig } from "@/types";
import { decodeAuthorization } from "@/utils/grant/decoding";
import {
  compareChainGrantsToTreasuryGrants,
  compareBankGrants,
  compareContractGrants,
} from "@/utils/grant/compare";
import type { DecodedReadableAuthorization } from "@/types";

// ─── Real treasury base64 values (verbatim from xion-testnet-2) ──────────────

/**
 * Treasury 1: xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw
 * Description: Known testnet treasury, "send funds" + "Execute on MAP and chess contract"
 * - SendAuthorization: 5000000 uxion
 * - ContractExecution: 2 contracts with MaxCallsLimit(100), AllowAllMessagesFilter
 */
const TREASURY_1_SEND = {
  type_url: "/cosmos.bank.v1beta1.SendAuthorization",
  value: "ChAKBXV4aW9uEgc1MDAwMDAw",
};
const TREASURY_1_CONTRACT = {
  type_url: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  value:
    "CpQBCj94aW9uMXE2NmgyeW5tcm01amU5YXdjZHdjeXhqeWtkNmMwaDR3ZjN1NWhhNHM1Y250ZjhqcjVqZnFoOG13ZXkSJQofL2Nvc213YXNtLndhc20udjEuTWF4Q2FsbHNMaW1pdBICCGQaKgooL2Nvc213YXNtLndhc20udjEuQWxsb3dBbGxNZXNzYWdlc0ZpbHRlcgqUAQo/eGlvbjFrbGxjdjNlcXhqY3hhZDlhM21uemY3cmw0aHFsYzRjd2MwczhyYXdwY3JzNHRhdmdoajBzN3ZnazhyEiUKHy9jb3Ntd2FzbS53YXNtLnYxLk1heENhbGxzTGltaXQSAghkGioKKC9jb3Ntd2FzbS53YXNtLnYxLkFsbG93QWxsTWVzc2FnZXNGaWx0ZXI=",
};

/**
 * Treasury 2: xion1fqum47npfdsl9jc0l2acf5lllmrx9w3p3zat2sw3k7nrgcewwn7qelsc4p
 * Description: Invoice financing platform, "Send money to escrow" + "Auction, Invoice Registry"
 * - SendAuthorization: 1000000 uxion
 * - ContractExecution: 2 contracts with MaxFundsLimit(ibc/6490A7E…, 1000000000000)
 */
const TREASURY_2_SEND = {
  type_url: "/cosmos.bank.v1beta1.SendAuthorization",
  value: "ChAKBXV4aW9uEgcxMDAwMDAw",
};
const TREASURY_2_CONTRACT = {
  type_url: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  value:
    "CuoBCj94aW9uMTg3OThqd2N2ZHVnc3c5eXBxNzQzOGxjNWQ4ZDhjdjRrbDBobXlycGZmdDh6ZTR5NXhjdXFkdnN2MjUSewofL2Nvc213YXNtLndhc20udjEuTWF4RnVuZHNMaW1pdBJYClYKRGliYy82NDkwQTdFQUI2MTA1OUJGQzFDRERFQjA1OTE3REQ3MEJERjNBNjExNjU0MTYyQTFBNDdEQjkzMEQ0MEQ4QUY0Eg4xMDAwMDAwMDAwMDAwMBoqCigvY29zbXdhc20ud2FzbS52MS5BbGxvd0FsbE1lc3NhZ2VzRmlsdGVyCuoBCj94aW9uMTdxeGo5MGt3dG11MzZleHlqMHA2Mmx6M2cwenFyZ2tmeXJsd2ZldXBjNXprenQ1NnV5NnM3c2xzNGoSewofL2Nvc213YXNtLndhc20udjEuTWF4RnVuZHNMaW1pdBJYClYKRGliYy82NDkwQTdFQUI2MTA1OUJGQzFDRERFQjA1OTE3REQ3MEJERjNBNjExNjU0MTYyQTFBNDdEQjkzMEQ0MEQ4QUY0Eg4xMDAwMDAwMDAwMDAwMBoqCigvY29zbXdhc20ud2FzbS52MS5BbGxvd0FsbE1lc3NhZ2VzRmlsdGVy",
};

/**
 * Treasury 3: xion1x4zc9xlrnn2zv0rjcal3clur8edhktzncqlp7e6gm5dw29hrsl2q705q9u
 * Description: Bank-only sample treasury
 * - SendAuthorization: 1000000 uxion
 */
const TREASURY_3_SEND = {
  type_url: "/cosmos.bank.v1beta1.SendAuthorization",
  value: "ChAKBXV4aW9uEgcxMDAwMDAw",
};

/**
 * Treasury 4: xion109k30exgltffjlyjtpyp4esm06s55hyw94eufk6840gjkte35tmq75hmy5
 * Description: MemoryCapsule — single contract, MaxFundsLimit(1000000 uxion)
 * - ContractExecution: 1 contract, MaxFundsLimit(uxion, 1000000), AllowAllMessagesFilter
 */
const TREASURY_4_CONTRACT = {
  type_url: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  value:
    "CqQBCj94aW9uMTJ6cmt2N2F0cGNmNGpyd2Zzanp3YW1kZWZobHJydXRrbHM2MmhmNm5naHJ2MHU5aGZkYXNrczlmcmcSNQofL2Nvc213YXNtLndhc20udjEuTWF4RnVuZHNMaW1pdBISChAKBXV4aW9uEgcxMDAwMDAwGioKKC9jb3Ntd2FzbS53YXNtLnYxLkFsbG93QWxsTWVzc2FnZXNGaWx0ZXI=",
};

/**
 * Treasury 5: xion1t3vjrp3l7u7ya4lajydrw2tdsz7lu0uu6w0pthwh3s82cvf0p6kshwfyj3
 * Description: UserMap + RUM — 2 contracts, MaxFundsLimit(2500 uxion each)
 * - ContractExecution: 2 contracts, MaxFundsLimit(uxion, 2500), AllowAllMessagesFilter
 */
const TREASURY_5_CONTRACT = {
  type_url: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  value:
    "CqEBCj94aW9uMWNsbmthNXljbjdtZW5uejBnZjlzcHpxZ2d3MmN2Mjc0eXBkNnQ3eDMyY3h2MnhxbWNxMHMyNWR2djgSMgofL2Nvc213YXNtLndhc20udjEuTWF4RnVuZHNMaW1pdBIPCg0KBXV4aW9uEgQyNTAwGioKKC9jb3Ntd2FzbS53YXNtLnYxLkFsbG93QWxsTWVzc2FnZXNGaWx0ZXIKoQEKP3hpb24xMmp4ZTM2MnVkNHgwbm12dXBtcDNwOGM5bjl3aHN6cjV3OHNkdHVmajltdTkwbHBha3p2cThxM252dhIyCh8vY29zbXdhc20ud2FzbS52MS5NYXhGdW5kc0xpbWl0Eg8KDQoFdXhpb24SBDI1MDAaKgooL2Nvc213YXNtLndhc20udjEuQWxsb3dBbGxNZXNzYWdlc0ZpbHRlcg==",
};

/**
 * Treasury 6: xion174jzarx57m4409aa7za9gn4f2wrmtn45vgpgvkjre9w0q83kgx6s25qk4a
 * Description: Custom factory token bank grant + UserMap contract
 * - SendAuthorization: factory/xion15r5y…/mytoken, amount 1000 (factory token denom!)
 * - ContractExecution: 1 contract, MaxFundsLimit(uxion, 2500)
 */
const TREASURY_6_SEND = {
  type_url: "/cosmos.bank.v1beta1.SendAuthorization",
  value:
    "CkMKO2ZhY3RvcnkveGlvbjE1cjV5eGFlcXdseDV6ejVmMnZ3Zzg3dnozbTdkNmRkNXBkZDZxcC9teXRva2VuEgQxMDAw",
};
const TREASURY_6_CONTRACT = {
  type_url: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  value:
    "CqEBCj94aW9uMXAzZWZ3eG5hdHk3dDkwc2g4MnJyeTY4dWRtNW03dnhlaDVyMzh5NDkzanY3dmtzbGpscnE4amhzdTkSMgofL2Nvc213YXNtLndhc20udjEuTWF4RnVuZHNMaW1pdBIPCg0KBXV4aW9uEgQyNTAwGioKKC9jb3Ntd2FzbS53YXNtLnYxLkFsbG93QWxsTWVzc2FnZXNGaWx0ZXI=",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulate what fetchChainGrantsABCI returns AFTER the fix:
 * Both REST format (@type, decoded fields) AND raw protobuf (typeUrl, value).
 *
 * For known types (Send, Stake, Generic) the REST format has decoded fields.
 * For unknown types (ContractExecution) the REST format only has @type + raw value.
 * Both always include typeUrl and value for treasury re-decoding.
 */
function makeChainGrant(
  restFormat: Record<string, unknown>,
  typeUrl: string,
  rawValue: Uint8Array,
  expiration = "2027-01-01T00:00:00Z",
) {
  return {
    granter: "xion1granter",
    grantee: "xion1grantee",
    authorization: {
      ...restFormat,
      typeUrl,
      value: rawValue,
    },
    expiration,
  };
}

/**
 * Run the same comparison path as AbstraxionAuth.compareGrantsToTreasuryWithConfigs
 */
function compareGrantsToTreasuryWithConfigs(
  grantsResponse: GrantsResponse,
  treasuryGrantConfigs: TreasuryGrantConfig[],
): boolean {
  const decodedTreasuryConfigs: DecodedReadableAuthorization[] =
    treasuryGrantConfigs.map((config) =>
      decodeAuthorization(
        config.authorization.type_url,
        config.authorization.value,
      ),
    );

  const decodedChainConfigs: DecodedReadableAuthorization[] =
    grantsResponse.grants.map((grant) =>
      decodeAuthorization(
        grant.authorization.typeUrl,
        grant.authorization.value,
      ),
    );

  const result = compareChainGrantsToTreasuryGrants(
    decodedChainConfigs,
    decodedTreasuryConfigs,
  );
  return result.match;
}

function encodeSendAuthorization(
  spendLimit: { denom: string; amount: string }[],
): Uint8Array {
  return SendAuthorization.encode(
    SendAuthorization.fromPartial({ spendLimit }),
  ).finish();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Treasury comparison with ABCI chain grants (bug fix)", () => {
  describe("Treasury 1 (xion1sv6kd…): Bank + ContractExec(MaxCallsLimit)", () => {
    const configs: TreasuryGrantConfig[] = [
      {
        description: "send funds",
        authorization: TREASURY_1_SEND,
        optional: false,
      },
      {
        description: "Execute on MAP and chess",
        authorization: TREASURY_1_CONTRACT,
        optional: false,
      },
    ];

    it("should match when chain grants have identical authorizations", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_1_SEND.type_url,
              spend_limit: [{ denom: "uxion", amount: "5000000" }],
              allow_list: [],
            },
            TREASURY_1_SEND.type_url,
            toByteArray(TREASURY_1_SEND.value),
          ),
          makeChainGrant(
            { "@type": TREASURY_1_CONTRACT.type_url, grants: [] },
            TREASURY_1_CONTRACT.type_url,
            toByteArray(TREASURY_1_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "2" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });

    it("should match when bank spend limit is partially used", () => {
      const partialSend = encodeSendAuthorization([
        { denom: "uxion", amount: "3000000" },
      ]);
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_1_SEND.type_url,
              spend_limit: [{ denom: "uxion", amount: "3000000" }],
              allow_list: [],
            },
            TREASURY_1_SEND.type_url,
            partialSend,
          ),
          makeChainGrant(
            { "@type": TREASURY_1_CONTRACT.type_url, grants: [] },
            TREASURY_1_CONTRACT.type_url,
            toByteArray(TREASURY_1_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "2" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });
  });

  describe("Treasury 2 (xion1fqum4…): Bank + ContractExec(MaxFundsLimit, IBC denom)", () => {
    const configs: TreasuryGrantConfig[] = [
      {
        description: "Send money to escrow",
        authorization: TREASURY_2_SEND,
        optional: false,
      },
      {
        description: "Auction, Invoice Registry",
        authorization: TREASURY_2_CONTRACT,
        optional: false,
      },
    ];

    it("should match when chain grants are identical", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_2_SEND.type_url,
              spend_limit: [{ denom: "uxion", amount: "1000000" }],
              allow_list: [],
            },
            TREASURY_2_SEND.type_url,
            toByteArray(TREASURY_2_SEND.value),
          ),
          makeChainGrant(
            { "@type": TREASURY_2_CONTRACT.type_url, grants: [] },
            TREASURY_2_CONTRACT.type_url,
            toByteArray(TREASURY_2_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "2" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });

    it("should NOT match when chain is missing the contract exec grant", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_2_SEND.type_url,
              spend_limit: [{ denom: "uxion", amount: "1000000" }],
              allow_list: [],
            },
            TREASURY_2_SEND.type_url,
            toByteArray(TREASURY_2_SEND.value),
          ),
        ],
        pagination: { next_key: null, total: "1" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        false,
      );
    });
  });

  describe("Treasury 3 (xion1x4zc9…): Bank-only", () => {
    const configs: TreasuryGrantConfig[] = [
      {
        description: "SAMPLE",
        authorization: TREASURY_3_SEND,
        optional: false,
      },
    ];

    it("should match when chain has matching send grant", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_3_SEND.type_url,
              spend_limit: [{ denom: "uxion", amount: "1000000" }],
              allow_list: [],
            },
            TREASURY_3_SEND.type_url,
            toByteArray(TREASURY_3_SEND.value),
          ),
        ],
        pagination: { next_key: null, total: "1" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });

    it("should NOT match when chain has exceeded spend limit", () => {
      const exceeded = encodeSendAuthorization([
        { denom: "uxion", amount: "2000000" },
      ]);
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_3_SEND.type_url,
              spend_limit: [{ denom: "uxion", amount: "2000000" }],
              allow_list: [],
            },
            TREASURY_3_SEND.type_url,
            exceeded,
          ),
        ],
        pagination: { next_key: null, total: "1" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        false,
      );
    });
  });

  describe("Treasury 4 (xion109k30…): MemoryCapsule — single contract MaxFundsLimit(uxion)", () => {
    const configs: TreasuryGrantConfig[] = [
      {
        description: "MemoryCapsule smart contract",
        authorization: TREASURY_4_CONTRACT,
        optional: false,
      },
    ];

    it("should match when chain has identical contract exec grant", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            { "@type": TREASURY_4_CONTRACT.type_url, grants: [] },
            TREASURY_4_CONTRACT.type_url,
            toByteArray(TREASURY_4_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "1" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });
  });

  describe("Treasury 5 (xion1t3vjr…): UserMap + RUM — multi-contract MaxFundsLimit(uxion, 2500)", () => {
    const configs: TreasuryGrantConfig[] = [
      {
        description: "User Map and RUM Contracts",
        authorization: TREASURY_5_CONTRACT,
        optional: false,
      },
    ];

    it("should match when chain has identical two-contract grant", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            { "@type": TREASURY_5_CONTRACT.type_url, grants: [] },
            TREASURY_5_CONTRACT.type_url,
            toByteArray(TREASURY_5_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "1" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });
  });

  describe("Treasury 6 (xion174jza…): Factory-token bank + ContractExec", () => {
    const configs: TreasuryGrantConfig[] = [
      {
        description: "SAMPLE factory token send",
        authorization: TREASURY_6_SEND,
        optional: false,
      },
      {
        description: "UserMap contract",
        authorization: TREASURY_6_CONTRACT,
        optional: false,
      },
    ];

    it("should match when chain has factory-token send + contract exec", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            {
              "@type": TREASURY_6_SEND.type_url,
              spend_limit: [
                {
                  denom:
                    "factory/xion15r5yxaeqwlx5zz5f2vwg87vz3m7d6dd5pdd6qp/mytoken",
                  amount: "1000",
                },
              ],
              allow_list: [],
            },
            TREASURY_6_SEND.type_url,
            toByteArray(TREASURY_6_SEND.value),
          ),
          makeChainGrant(
            { "@type": TREASURY_6_CONTRACT.type_url, grants: [] },
            TREASURY_6_CONTRACT.type_url,
            toByteArray(TREASURY_6_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "2" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        true,
      );
    });

    it("should NOT match when chain is missing the factory-token send grant", () => {
      const chainGrants: GrantsResponse = {
        grants: [
          makeChainGrant(
            { "@type": TREASURY_6_CONTRACT.type_url, grants: [] },
            TREASURY_6_CONTRACT.type_url,
            toByteArray(TREASURY_6_CONTRACT.value),
          ),
        ],
        pagination: { next_key: null, total: "1" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, configs)).toBe(
        false,
      );
    });
  });

  describe("Empty treasury (no grant configs)", () => {
    it("should return true when both treasury and chain have no grants", () => {
      const chainGrants: GrantsResponse = {
        grants: [],
        pagination: { next_key: null, total: "0" },
      };
      expect(compareGrantsToTreasuryWithConfigs(chainGrants, [])).toBe(true);
    });
  });
});

describe("Legacy comparison still works with dual-format grants", () => {
  it("should correctly validate bank grants using @type format", () => {
    const grants = [
      {
        authorization: {
          "@type": "/cosmos.bank.v1beta1.SendAuthorization",
          spend_limit: [{ denom: "uxion", amount: "1000000" }],
          allow_list: [],
          // Raw fields added by the fix — should not interfere with legacy comparison
          typeUrl: "/cosmos.bank.v1beta1.SendAuthorization",
          value: toByteArray(TREASURY_3_SEND.value),
        },
        expiration: "2027-01-01T00:00:00Z",
      },
    ];

    expect(
      compareBankGrants(grants as any, [{ denom: "uxion", amount: "1000000" }]),
    ).toBe(true);
    expect(compareBankGrants(grants as any, undefined)).toBe(true);
  });

  it("should correctly validate contract grants with dual-format fields", () => {
    // Use a real contract address from Treasury 1
    const contractAddress =
      "xion1q66h2ynmrm5je9awcdwcyxjykd6c0h4wf3u5ha4s5cntf8jr5jfqh8mwey";
    const grants = [
      {
        authorization: {
          "@type": "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
          grants: [
            {
              contract: contractAddress,
              limit: {
                "@type": "/cosmwasm.wasm.v1.MaxCallsLimit",
                remaining: "100",
              },
              filter: { "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter" },
            },
          ],
          typeUrl: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
          value: toByteArray(TREASURY_1_CONTRACT.value),
        },
        expiration: "2027-01-01T00:00:00Z",
      },
    ];

    expect(compareContractGrants(grants as any, [contractAddress])).toBe(true);
    expect(compareContractGrants(grants as any, undefined)).toBe(true);
  });
});

describe("Bug reproduction: pre-fix vs post-fix decoding", () => {
  it("should decode as Unsupported when typeUrl is missing (pre-fix behavior)", () => {
    const decoded = decodeAuthorization(undefined as any, undefined as any);
    expect(decoded.type).toBe("Unsupported");
    expect(decoded.data).toBeNull();
  });

  it("should decode SendAuthorization correctly with typeUrl+value (post-fix)", () => {
    const decoded = decodeAuthorization(
      TREASURY_2_SEND.type_url,
      TREASURY_2_SEND.value,
    );
    expect(decoded.type).toBe("/cosmos.bank.v1beta1.SendAuthorization");
    expect(decoded.data).not.toBeNull();
  });

  it("should decode ContractExecution MaxFundsLimit with IBC denom (Treasury 2)", () => {
    const decoded = decodeAuthorization(
      TREASURY_2_CONTRACT.type_url,
      TREASURY_2_CONTRACT.value,
    );
    expect(decoded.type).toBe(
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
    );
    expect((decoded.data as any).grants).toHaveLength(2);
    expect((decoded.data as any).grants[0].limitType).toBe(
      "/cosmwasm.wasm.v1.MaxFundsLimit",
    );
  });

  it("should decode ContractExecution MaxCallsLimit (Treasury 1)", () => {
    const decoded = decodeAuthorization(
      TREASURY_1_CONTRACT.type_url,
      TREASURY_1_CONTRACT.value,
    );
    expect(decoded.type).toBe(
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
    );
    expect((decoded.data as any).grants).toHaveLength(2);
    expect((decoded.data as any).grants[0].limitType).toBe(
      "/cosmwasm.wasm.v1.MaxCallsLimit",
    );
  });

  it("should decode single-contract MaxFundsLimit uxion (Treasury 4 — MemoryCapsule)", () => {
    const decoded = decodeAuthorization(
      TREASURY_4_CONTRACT.type_url,
      TREASURY_4_CONTRACT.value,
    );
    expect(decoded.type).toBe(
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
    );
    expect((decoded.data as any).grants).toHaveLength(1);
    expect((decoded.data as any).grants[0].limitType).toBe(
      "/cosmwasm.wasm.v1.MaxFundsLimit",
    );
  });

  it("should decode multi-contract MaxFundsLimit small amount (Treasury 5 — UserMap+RUM)", () => {
    const decoded = decodeAuthorization(
      TREASURY_5_CONTRACT.type_url,
      TREASURY_5_CONTRACT.value,
    );
    expect(decoded.type).toBe(
      "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
    );
    expect((decoded.data as any).grants).toHaveLength(2);
    expect((decoded.data as any).grants[0].limitType).toBe(
      "/cosmwasm.wasm.v1.MaxFundsLimit",
    );
  });

  it("should decode factory-token SendAuthorization (Treasury 6)", () => {
    const decoded = decodeAuthorization(
      TREASURY_6_SEND.type_url,
      TREASURY_6_SEND.value,
    );
    expect(decoded.type).toBe("/cosmos.bank.v1beta1.SendAuthorization");
    const sendData = decoded.data as any;
    expect(sendData.spendLimit).toHaveLength(1);
    expect(sendData.spendLimit[0].denom).toContain("factory/");
    expect(sendData.spendLimit[0].amount).toBe("1000");
  });
});
