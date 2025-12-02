import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
/**
 * @vitest-environment jsdom
 */
import {
  isLimitValid,
  compareChainGrantsToTreasuryGrants,
  validateContractExecution,
} from "@/utils/grant/compare";
import { decodeAuthorization } from "@/utils/grant/decoding";
import {
  AuthorizationTypes,
  ContractExecFilterTypes,
  ContractExecLimitTypes,
} from "@/utils/grant/constants";
import { DecodedReadableAuthorization, GrantsResponse } from "@/types";

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
      const decodedChainConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "1000",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];

      const decodedTreasuryConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "1000",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];
      expect(
        compareChainGrantsToTreasuryGrants(
          decodedChainConfigs,
          decodedTreasuryConfigs,
        ),
      ).toBe(true);
    });

    it("should return false when grants don't match", () => {
      const decodedChainConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "1000",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];

      const decodedTreasuryConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "ibc/1000",
                amount: "1000",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];
      expect(
        compareChainGrantsToTreasuryGrants(
          decodedChainConfigs,
          decodedTreasuryConfigs,
        ),
      ).toBe(false);
    });

    it("should return true when on chain SpendLimit is <= treasury SpendLimit on SendAuthorizations", () => {
      const decodedChainConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "999",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];

      const decodedTreasuryConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "1000",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];
      expect(
        compareChainGrantsToTreasuryGrants(
          decodedChainConfigs,
          decodedTreasuryConfigs,
        ),
      ).toBe(true);
    });

    it("should return false when on chain SpendLimit is > treasury SpendLimit on SendAuthorizations", () => {
      const decodedChainConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "1001",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];

      const decodedTreasuryConfigs: DecodedReadableAuthorization[] = [
        {
          type: "/cosmos.bank.v1beta1.SendAuthorization" as AuthorizationTypes,
          data: {
            spendLimit: [
              {
                denom: "uxion",
                amount: "1000",
              },
            ],
            allowList: [
              "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
            ],
          },
        },
      ];
      expect(
        compareChainGrantsToTreasuryGrants(
          decodedChainConfigs,
          decodedTreasuryConfigs,
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
    expect(result).toEqual({
      type: "/cosmos.authz.v1beta1.GenericAuthorization",
      data: { msg: "/cosmwasm.wasm.v1.MsgInstantiateContract" },
    });
  });

  it("should decode SendAuthorization correctly", () => {
    const typeUrl = "/cosmos.bank.v1beta1.SendAuthorization";
    const value =
      "Cg0KBXV4aW9uEgQxMDAwEj94aW9uMWY3YzNjZDI2czh2ZXE5cnA5NHQ3eXNyZWFjejRhZW1laDB0bDB3Y215c2xqZ3JtNnFhcHF1NmpoNXg=";
    const result = decodeAuthorization(typeUrl, value);
    expect(result).toEqual({
      type: "/cosmos.bank.v1beta1.SendAuthorization",
      data: {
        spendLimit: [{ denom: "uxion", amount: "1000" }],
        allowList: [
          "xion1f7c3cd26s8veq9rp94t7ysreacz4aemeh0tl0wcmysljgrm6qapqu6jh5x",
        ],
      },
    });
  });

  it("should decode ContractExecutionAuthorization correctly", () => {
    const typeUrl = "/cosmwasm.wasm.v1.ContractExecutionAuthorization";
    const value =
      "CpUBCj94aW9uMXo3MGN2YzA4cXY1NzY0emVnM2R5a2N5eW1qNXo2bnU0c3FyN3g4dmw0emplZjJneXA2OXM5bW1ka2ESJgofL2Nvc213YXNtLndhc20udjEuTWF4Q2FsbHNMaW1pdBIDCP8BGioKKC9jb3Ntd2FzbS53YXNtLnYxLkFsbG93QWxsTWVzc2FnZXNGaWx0ZXI=";
    const result = decodeAuthorization(typeUrl, value);
    expect(result).toEqual({
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
      data: {
        grants: [
          {
            address:
              "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka",
            limitType: "/cosmwasm.wasm.v1.MaxCallsLimit",
            maxCalls: "255",
            filterType: "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
          },
        ],
      },
    });
  });

  it("should return null for unknown typeUrl", () => {
    const typeUrl = "/unknown.type.url";
    const value = "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0";
    const result = decodeAuthorization(typeUrl, value);
    expect(result).toEqual({ type: "Unsupported", data: null });
  });
});

describe("validateContractExecution", () => {
  it("should return true when decoded grants match the chain grants", () => {
    const treasuryAuth: DecodedReadableAuthorization = {
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization" as AuthorizationTypes,
      data: {
        grants: [
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "1000",
            maxFunds: [
              {
                denom:
                  "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                amount: "10000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
          },
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "1000",
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
          },
        ],
      },
    };

    const chainAuth: DecodedReadableAuthorization = {
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization" as AuthorizationTypes,
      data: {
        grants: [
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "1000",
            maxFunds: [
              {
                denom:
                  "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                amount: "10000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
          },
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "1000",
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
          },
        ],
      },
    };

    const result = validateContractExecution(treasuryAuth, chainAuth);

    expect(result).toBe(true);
  });

  it("should return false when decoded grants do not match the chain grants", () => {
    const treasuryAuth: DecodedReadableAuthorization = {
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization" as AuthorizationTypes,
      data: {
        grants: [
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "10",
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
            messages: [],
            keys: [],
          },
        ],
      },
    };

    const chainAuth: DecodedReadableAuthorization = {
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization" as AuthorizationTypes,
      data: {
        grants: [
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "1000",
            maxFunds: [
              {
                denom:
                  "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                amount: "10000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
            messages: [],
            keys: [],
          },
        ],
      },
    };

    const result = validateContractExecution(treasuryAuth, chainAuth);

    expect(result).toBe(false);
  });

  it("should return true when chain maxCalls is less than treasury maxCalls", () => {
    const treasuryAuth: DecodedReadableAuthorization = {
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization" as AuthorizationTypes,
      data: {
        grants: [
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "10",
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
          },
        ],
      },
    };

    const chainAuth: DecodedReadableAuthorization = {
      type: "/cosmwasm.wasm.v1.ContractExecutionAuthorization" as AuthorizationTypes,
      data: {
        grants: [
          {
            address:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limitType:
              "/cosmwasm.wasm.v1.CombinedLimit" as ContractExecLimitTypes,
            maxCalls: "5", // Less than treasury's maxCalls
            maxFunds: [
              {
                denom: "uxion",
                amount: "1000000",
              },
            ],
            filterType:
              "/cosmwasm.wasm.v1.AllowAllMessagesFilter" as ContractExecFilterTypes,
          },
        ],
      },
    };

    const result = validateContractExecution(treasuryAuth, chainAuth);

    expect(result).toBe(true);
  });
});
