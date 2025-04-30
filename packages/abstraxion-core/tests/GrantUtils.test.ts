/**
 * @jest-environment jsdom
 */
import {
  isLimitValid,
  compareChainGrantsToTreasuryGrants,
  validateContractExecution,
} from "@/utils/grant/compare";
import { decodeAuthorization } from "@/utils/grant/decoding";
import { DecodeAuthorizationResponse, GrantsResponse } from "@/types";

// Add fetch polyfill for Node.js environment
if (typeof fetch === "undefined") {
  global.fetch = jest.fn();
}

jest.mock("@/utils/rpcClient", () => ({
  getRpcClient: jest.fn().mockResolvedValue({}),
}));

describe("Grant Comparison Utilities", () => {
  describe("isLimitValid", () => {
    it("should return true when chain spend limit is less than expected", () => {
      const expectedSpendLimit = [
        { denom: "uxion", amount: "1000" },
        { denom: "atom", amount: "500" },
      ];
      const chainSpendLimit = [
        { denom: "uxion", amount: "800" },
        { denom: "atom", amount: "300" },
      ];

      const result = isLimitValid(expectedSpendLimit, chainSpendLimit);
      expect(result).toBe(true);
    });

    it("should return true when chain spend limit is equal to expected", () => {
      const expectedSpendLimit = [
        { denom: "uxion", amount: "1000" },
        { denom: "atom", amount: "500" },
      ];
      const chainSpendLimit = [
        { denom: "uxion", amount: "1000" },
        { denom: "atom", amount: "500" },
      ];

      const result = isLimitValid(expectedSpendLimit, chainSpendLimit);
      expect(result).toBe(true);
    });

    it("should return false when chain spend limit is greater than expected", () => {
      const expectedSpendLimit = [
        { denom: "uxion", amount: "1000" },
        { denom: "atom", amount: "500" },
      ];
      const chainSpendLimit = [
        { denom: "uxion", amount: "1200" }, // Greater than expected
        { denom: "atom", amount: "500" },
      ];

      const result = isLimitValid(expectedSpendLimit, chainSpendLimit);
      expect(result).toBe(false);
    });

    it("should return false when chain spend limit has unexpected denominations", () => {
      const expectedSpendLimit = [
        { denom: "uxion", amount: "1000" },
        { denom: "atom", amount: "500" },
      ];
      const chainSpendLimit = [
        { denom: "uxion", amount: "800" },
        { denom: "btc", amount: "300" }, // Unexpected denomination
      ];

      const result = isLimitValid(expectedSpendLimit, chainSpendLimit);
      expect(result).toBe(false);
    });

    it("should return false when expected spend limit is undefined", () => {
      const expectedSpendLimit = undefined;
      const chainSpendLimit = [
        { denom: "uxion", amount: "800" },
        { denom: "atom", amount: "300" },
      ];

      const result = isLimitValid(expectedSpendLimit, chainSpendLimit);
      expect(result).toBe(false);
    });
  });

  describe("compareChainGrantsToTreasuryGrants", () => {
    it("should return true when all grants match", () => {
      const grantsResponse: GrantsResponse = {
        grants: [
          {
            authorization: {
              typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
              value: [
                10, 40, 47, 99, 111, 115, 109, 119, 97, 115, 109, 46, 119, 97,
                115, 109, 46, 118, 49, 46, 77, 115, 103, 73, 110, 115, 116, 97,
                110, 116, 105, 97, 116, 101, 67, 111, 110, 116, 114, 97, 99,
                116,
              ],
            },
            expiration: "2025-07-29T23:51:14.000Z",
            grantee: "xion1j4emdffrkt322wm9jgqd43dttv33u4unrd6lw2",
            granter:
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
          },
        ],
        pagination: { next_key: null, total: "1" },
      };

      const treasuryGrantConfigs = [
        {
          description: "Test Grant",
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0",
          },
          optional: false,
        },
      ];
      expect(
        compareChainGrantsToTreasuryGrants(
          grantsResponse,
          treasuryGrantConfigs,
        ),
      ).toBe(true);
    });

    it("should return false when grants do not match", () => {
      const grantsResponse: GrantsResponse = {
        grants: [
          {
            authorization: {
              typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
              value: [
                10, 40, 47, 99, 111, 115, 109, 119, 97, 115, 109, 46, 119, 97,
                115, 109, 46, 118, 49, 46, 77, 115, 103, 73, 110, 115, 116, 97,
                110, 116, 105, 97, 116, 101, 67, 111, 110, 116, 114, 97, 99,
                116,
              ],
            },
            expiration: "2025-07-29T23:51:14.000Z",
            grantee: "xion1j4emdffrkt322wm9jgqd43dttv33u4unrd6lw2",
            granter:
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
          },
        ],
        pagination: { next_key: null, total: "1" },
      };
      const treasuryGrantConfigs = [
        {
          description: "Test Grant",
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN9",
          },
          optional: false,
        },
      ];
      expect(
        compareChainGrantsToTreasuryGrants(
          grantsResponse,
          treasuryGrantConfigs,
        ),
      ).toBe(false);
    });
  });
});

describe("Grant Decoding Utilities", () => {
  it("should decode GenericAuthorization correctly", () => {
    const typeUrl = "/cosmos.authz.v1beta1.GenericAuthorization";
    const value = "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0";
    const result = decodeAuthorization(typeUrl, value);
    expect(result).toEqual({ msg: "/cosmwasm.wasm.v1.MsgInstantiateContract" });
  });

  it("should decode SendAuthorization correctly", () => {
    const typeUrl = "/cosmos.bank.v1beta1.SendAuthorization";
    const value =
      "Cg0KBXV4aW9uEgQxMDAwEj94aW9uMWY3YzNjZDI2czh2ZXE5cnA5NHQ3eXNyZWFjejRhZW1laDB0bDB3Y215c2xqZ3JtNnFhcHF1NmpoNXg=";
    const result = decodeAuthorization(typeUrl, value);
    expect(result).toEqual({
      spendLimit: [{ denom: "uxion", amount: "1000" }],
      allowList: [
        "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
      ],
    });
  });

  it("should return null for unknown typeUrl", () => {
    const typeUrl = "/unknown.type.url";
    const value = "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0";
    const result = decodeAuthorization(typeUrl, value);
    expect(result).toBeNull();
  });
});

describe("validateContractExecution", () => {
  it("should return true when decoded grants match the chain grants", () => {
    const treasuryAuth: DecodeAuthorizationResponse = {
      contracts: [
        {
          contract:
            "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
          limitType: "CombinedLimit",
          combinedLimits: {
            maxCalls: "1000",
            maxFunds: [
              {
                denom:
                  "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                amount: "10000",
              },
            ],
          },
          filter: {
            typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        },
        {
          contract:
            "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
          limitType: "CombinedLimit",
          combinedLimits: {
            maxCalls: "1000",
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
          },
          filter: {
            typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        },
      ],
    };

    const chainAuth: DecodeAuthorizationResponse = {
      contracts: [
        {
          contract:
            "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
          limitType: "CombinedLimit",
          combinedLimits: {
            maxCalls: "1000",
            maxFunds: [
              {
                denom:
                  "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                amount: "10000",
              },
            ],
          },
          filter: {
            typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        },
        {
          contract:
            "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
          limitType: "CombinedLimit",
          combinedLimits: {
            maxCalls: "1000",
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
          },
          filter: {
            typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        },
      ],
    };

    const result = validateContractExecution(treasuryAuth, chainAuth);

    expect(result).toBe(true);
  });

  it("should return false when decoded grants do not match the chain grants", () => {
    const treasuryAuth: DecodeAuthorizationResponse = {
      contracts: [
        {
          contract:
            "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
          limitType: "CombinedLimit",
          combinedLimits: {
            maxCalls: "1000",
            maxFunds: [
              {
                denom:
                  "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                amount: "10000",
              },
            ],
          },
          filter: {
            typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        },
      ],
    };

    const chainAuth: DecodeAuthorizationResponse = {
      contracts: [
        {
          contract:
            "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
          limitType: "CombinedLimit",
          combinedLimits: {
            maxCalls: "10",
            maxFunds: [
              {
                denom: "uxion",
                amount: "10000",
              },
            ],
          },
          filter: {
            typeUrl: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        },
      ],
    };

    const result = validateContractExecution(treasuryAuth, chainAuth);

    expect(result).toBe(false);
  });
});
