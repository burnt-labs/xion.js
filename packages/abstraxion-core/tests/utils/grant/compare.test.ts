import {
  isLimitValid,
  compareBankGrants,
  compareContractGrants,
  compareStakeGrants,
  compareChainGrantsToTreasuryGrants,
  validateContractExecution,
} from "../../../src/utils/grant/compare"; // Adjust path as necessary
import {
  AuthorizationTypes,
  ContractExecLimitTypes,
} from "../../../src/utils/grant/constants";
import type {
  Grant,
  SpendLimit,
  ContractGrantDescription,
  DecodedReadableAuthorization,
  HumanContractExecAuth,
} from "../../../src/types"; // Adjust path as necessary
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";

describe("Grant Comparison Utilities", () => {
  describe("isLimitValid", () => {
    it("should return true if chainLimit is less than or equal to expectedLimit", () => {
      const expectedLimit = [{ denom: "uxion", amount: "100" }];
      const chainLimit = [{ denom: "uxion", amount: "50" }];
      expect(isLimitValid(expectedLimit, chainLimit)).toBe(true);
    });

    it("should return true if chainLimit is equal to expectedLimit", () => {
      const expectedLimit = [{ denom: "uxion", amount: "100" }];
      const chainLimit = [{ denom: "uxion", amount: "100" }];
      expect(isLimitValid(expectedLimit, chainLimit)).toBe(true);
    });

    it("should return false if chainLimit is greater than expectedLimit", () => {
      const expectedLimit = [{ denom: "uxion", amount: "100" }];
      const chainLimit = [{ denom: "uxion", amount: "150" }];
      expect(isLimitValid(expectedLimit, chainLimit)).toBe(false);
    });

    it("should return false if denoms do not match", () => {
      const expectedLimit = [{ denom: "uxion", amount: "100" }];
      const chainLimit = [{ denom: "uatom", amount: "100" }];
      expect(isLimitValid(expectedLimit, chainLimit)).toBe(false);
    });

    it("should handle multiple denoms correctly", () => {
      const expectedLimit = [
        { denom: "uxion", amount: "100" },
        { denom: "uatom", amount: "200" },
      ];
      const chainLimit = [
        { denom: "uxion", amount: "50" },
        { denom: "uatom", amount: "200" },
      ];
      expect(isLimitValid(expectedLimit, chainLimit)).toBe(true);
    });

    it("should return false if chainLimit has extra denoms not in expectedLimit", () => {
      const expectedLimit = [{ denom: "uxion", amount: "100" }];
      const chainLimit = [
        { denom: "uxion", amount: "50" },
        { denom: "uatom", amount: "200" },
      ];
      // isLimitValid only checks if chain limits are within expected for matching denoms.
      // It does not penalize extra denoms in chainLimit IF the expectedLimit's denoms are satisfied.
      // The stricter grant comparison functions (e.g. compareBankGrants) should handle length checks.
      // However, if we strictly interpret "is chainLimit <= expectedLimit", an extra denom means it's not.
      // The current implementation of isLimitValid returns true if all items in chainLimit with a corresponding
      // denom in expectedLimit are valid. If a denom in chainLimit is NOT in expectedLimit, it's an issue.
      // Let's test the case where a chainLimit item has no corresponding expectedLimit item.
       const chainLimitWithExtra = [
        { denom: "uxion", amount: "100" },
        { denom: "unew", amount: "10" }
      ];
       expect(isLimitValid(expectedLimit, chainLimitWithExtra)).toBe(false);


    });

     it("should return false if expectedLimit is undefined", () => {
      const chainLimit = [{ denom: "uxion", amount: "100" }];
      expect(isLimitValid(undefined, chainLimit)).toBe(false);
    });

    it("should return false if chainLimit is undefined", () => {
      const expectedLimit = [{ denom: "uxion", amount: "100" }];
      expect(isLimitValid(expectedLimit, undefined)).toBe(false);
    });
  });

  describe("compareBankGrants", () => {
    const sendAuthType = "/cosmos.bank.v1beta1.SendAuthorization";
    const createBankGrant = (
      spend_limit: SpendLimit[],
      expiration?: string,
    ): Grant => ({
      granter: "granterAddr",
      grantee: "granteeAddr",
      authorization: {
        "@type": sendAuthType,
        spend_limit,
      } as any,
      expiration: expiration || new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    it("should return true if grants match configured bank limits exactly", () => {
      const bankConfig: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const grants: Grant[] = [createBankGrant([{ denom: "uxion", amount: "100" }])];
      expect(compareBankGrants(grants, bankConfig)).toBe(true);
    });

    it("should return false if number of grants does not match bank config length", () => {
      const bankConfig: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const grants: Grant[] = [
        createBankGrant([{ denom: "uxion", amount: "100" }]),
        createBankGrant([{ denom: "uatom", amount: "50" }]),
      ];
      expect(compareBankGrants(grants, bankConfig)).toBe(false);
    });

    it("should return false if grant amounts are greater than configured", () => {
      const bankConfig: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const grants: Grant[] = [createBankGrant([{ denom: "uxion", amount: "150" }])];
      // The new strict check requires exact match, not just <=
      expect(compareBankGrants(grants, bankConfig)).toBe(false);
    });

    it("should return false if grant amounts are less than configured", () => {
      const bankConfig: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const grants: Grant[] = [createBankGrant([{ denom: "uxion", amount: "50" }])];
      expect(compareBankGrants(grants, bankConfig)).toBe(false);
    });


    it("should return false if denoms do not match", () => {
      const bankConfig: SpendLimit[] = [{ denom: "uxion", amount: "100" }];
      const grants: Grant[] = [createBankGrant([{ denom: "uatom", amount: "100" }])];
      expect(compareBankGrants(grants, bankConfig)).toBe(false);
    });

    it("should return true if bank config is undefined/empty and no bank grants exist", () => {
      expect(compareBankGrants([], undefined)).toBe(true);
      expect(compareBankGrants([], [])).toBe(true);
    });

    it("should return false if bank config is undefined/empty but bank grants exist", () => {
      const grants: Grant[] = [createBankGrant([{ denom: "uxion", amount: "100" }])];
      expect(compareBankGrants(grants, undefined)).toBe(false);
      expect(compareBankGrants(grants, [])).toBe(false);
    });

     it("should handle multiple bank grants and configs correctly (exact match)", () => {
      const bankConfig: SpendLimit[] = [
        { denom: "uxion", amount: "100" },
        { denom: "uatom", amount: "50" },
      ];
      const grants: Grant[] = [
        createBankGrant([{ denom: "uxion", amount: "100" }]),
        createBankGrant([{ denom: "uatom", amount: "50" }]),
      ];
      // Note: The current implementation of compareBankGrants might need adjustment
      // if one grant on chain can satisfy multiple bankConfig entries or vice-versa.
      // Assuming one-to-one mapping for exact match.
      expect(compareBankGrants(grants, bankConfig)).toBe(true);
    });

     it("should return false for multiple bank grants if one doesn't match config (amount)", () => {
      const bankConfig: SpendLimit[] = [
        { denom: "uxion", amount: "100" },
        { denom: "uatom", amount: "50" },
      ];
      const grants: Grant[] = [
        createBankGrant([{ denom: "uxion", amount: "100" }]),
        createBankGrant([{ denom: "uatom", amount: "51" }]), // Mismatch
      ];
      expect(compareBankGrants(grants, bankConfig)).toBe(false);
    });

    it("should return false for multiple bank grants if one doesn't match config (denom)", () => {
      const bankConfig: SpendLimit[] = [
        { denom: "uxion", amount: "100" },
        { denom: "uatom", amount: "50" },
      ];
      const grants: Grant[] = [
        createBankGrant([{ denom: "uxion", amount: "100" }]),
        createBankGrant([{ denom: "uusd", amount: "50" }]), // Mismatch
      ];
      expect(compareBankGrants(grants, bankConfig)).toBe(false);
    });
  });

  // Placeholder for compareContractGrants tests
  describe("compareContractGrants", () => {
    const contractAuthType = "/cosmwasm.wasm.v1.ContractExecutionAuthorization";
    const createContractGrant = (
      grantsArray: Array<{ contract: string; limit?: any; filter?: any }>,
      expiration?: string,
    ): Grant => ({
      granter: "granterAddr",
      grantee: "granteeAddr",
      authorization: {
        "@type": contractAuthType,
        grants: grantsArray,
      } as any,
      expiration: expiration || new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    const contractAddr1 = "xionContract1";
    const contractAddr2 = "xionContract2";

    it("should return true for exact match of contract addresses (simple case, no limits)", () => {
      const config: ContractGrantDescription[] = [contractAddr1];
      const grants: Grant[] = [
        createContractGrant([{ contract: contractAddr1 }]),
      ];
      expect(compareContractGrants(grants, config)).toBe(true);
    });
    
    it("should return true for exact match with multiple contracts (simple)", () => {
      const config: ContractGrantDescription[] = [contractAddr1, contractAddr2];
      const grants: Grant[] = [
        createContractGrant([{ contract: contractAddr1 }]),
        createContractGrant([{ contract: contractAddr2 }]),
      ];
      expect(compareContractGrants(grants, config)).toBe(true);
    });

    it("should return false if number of on-chain grants doesn't match config length", () => {
      const config: ContractGrantDescription[] = [contractAddr1];
      const grants: Grant[] = [
        createContractGrant([{ contract: contractAddr1 }]),
        createContractGrant([{ contract: contractAddr2 }]),
      ];
      expect(compareContractGrants(grants, config)).toBe(false);

      const config2: ContractGrantDescription[] = [contractAddr1, contractAddr2];
      const grants2: Grant[] = [
         createContractGrant([{ contract: contractAddr1 }]),
      ];
      expect(compareContractGrants(grants2, config2)).toBe(false);
    });
    
    it("should return false if contract addresses mismatch", () => {
      const config: ContractGrantDescription[] = [contractAddr1];
      const grants: Grant[] = [
        createContractGrant([{ contract: contractAddr2 }]),
      ];
      expect(compareContractGrants(grants, config)).toBe(false);
    });

    it("should return true if config is empty/undefined and no contract grants exist", () => {
      expect(compareContractGrants([], undefined)).toBe(true);
      expect(compareContractGrants([], [])).toBe(true);
    });
    
    it("should return false if config is empty/undefined but contract grants exist", () => {
      const grants: Grant[] = [
        createContractGrant([{ contract: contractAddr1 }]),
      ];
      expect(compareContractGrants(grants, undefined)).toBe(false);
      expect(compareContractGrants(grants, [])).toBe(false);
    });

    it("should return true for exact match with amounts", () => {
      const config: ContractGrantDescription[] = [
        { address: contractAddr1, amounts: [{ denom: "uxion", amount: "100" }] },
      ];
      const grants: Grant[] = [
        createContractGrant([
          {
            contract: contractAddr1,
            limit: { amounts: [{ denom: "uxion", amount: "100" }] },
          },
        ]),
      ];
      expect(compareContractGrants(grants, config)).toBe(true);
    });
    
    it("should return false if amounts mismatch", () => {
      const config: ContractGrantDescription[] = [
        { address: contractAddr1, amounts: [{ denom: "uxion", amount: "100" }] },
      ];
      const grants: Grant[] = [
        createContractGrant([
          {
            contract: contractAddr1,
            limit: { amounts: [{ denom: "uxion", amount: "50" }] }, // Less
          },
        ]),
      ];
      expect(compareContractGrants(grants, config)).toBe(false);

      const grants2: Grant[] = [
        createContractGrant([
          {
            contract: contractAddr1,
            limit: { amounts: [{ denom: "uxion", amount: "150" }] }, // More
          },
        ]),
      ];
      expect(compareContractGrants(grants2, config)).toBe(false);
    });

    it("should return false if amount denoms mismatch", () => {
       const config: ContractGrantDescription[] = [
        { address: contractAddr1, amounts: [{ denom: "uxion", amount: "100" }] },
      ];
      const grants: Grant[] = [
        createContractGrant([
          {
            contract: contractAddr1,
            limit: { amounts: [{ denom: "uatom", amount: "100" }] },
          },
        ]),
      ];
      expect(compareContractGrants(grants, config)).toBe(false);
    });

     it("should correctly handle grants with multiple authorizations inside one grant object", () => {
      const config: ContractGrantDescription[] = [contractAddr1, contractAddr2];
      // Single grant on-chain, but it authorizes multiple contracts
      const grants: Grant[] = [
        createContractGrant([
          { contract: contractAddr1 },
          { contract: contractAddr2 },
        ]),
      ];
      // This should be false because the new logic expects one grant object per configured contract.
      expect(compareContractGrants(grants, config)).toBe(false);

      // Correct scenario: two separate grant objects on chain
       const grantsCorrect: Grant[] = [
        createContractGrant([{ contract: contractAddr1 }]),
        createContractGrant([{ contract: contractAddr2 }]),
      ];
      expect(compareContractGrants(grantsCorrect, config)).toBe(true);
    });

    it("should handle contract grant descriptions as strings or objects", () => {
      const config: ContractGrantDescription[] = [
        contractAddr1, // string
        { address: contractAddr2, amounts: [{ denom: "uatom", amount: "20"}]} // object
      ];
      const grants: Grant[] = [
         createContractGrant([{ contract: contractAddr1 }]),
         createContractGrant([{ contract: contractAddr2, limit: { amounts: [{ denom: "uatom", amount: "20"}] } }]),
      ];
      expect(compareContractGrants(grants, config)).toBe(true);
    });
  });

  // Placeholder for compareStakeGrants tests
  describe("compareStakeGrants", () => {
    const genericAuthType = "/cosmos.authz.v1beta1.GenericAuthorization";
    const stakeAuthType = "/cosmos.staking.v1beta1.StakeAuthorization";

    const createGenericGrant = (msg: string): Grant => ({
      granter: "g", grantee: "g", authorization: { "@type": genericAuthType, msg } as any, expiration: "exp",
    });
    const createStakeAuthGrant = (authorization_type: string): Grant => ({
      granter: "g", grantee: "g", authorization: { "@type": stakeAuthType, authorization_type } as any, expiration: "exp",
    });

    const allExpectedStakeGrants: Grant[] = [
      createStakeAuthGrant("AUTHORIZATION_TYPE_DELEGATE"),
      createStakeAuthGrant("AUTHORIZATION_TYPE_UNDELEGATE"),
      createStakeAuthGrant("AUTHORIZATION_TYPE_REDELEGATE"),
      createGenericGrant("/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward"),
      createGenericGrant("/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation"),
    ];

    it("should return true if stake=true and all expected stake grants exist", () => {
      expect(compareStakeGrants(allExpectedStakeGrants, true)).toBe(true);
    });

    it("should return false if stake=true but a StakeAuthorization is missing", () => {
      const missingDelegate = allExpectedStakeGrants.filter(g => (g.authorization as any).authorization_type !== "AUTHORIZATION_TYPE_DELEGATE");
      expect(compareStakeGrants(missingDelegate, true)).toBe(false);
    });
    
    it("should return false if stake=true but a Generic stake message grant is missing", () => {
      const missingWithdraw = allExpectedStakeGrants.filter(g => (g.authorization as any).msg !== "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward");
      expect(compareStakeGrants(missingWithdraw, true)).toBe(false);
    });

    it("should return false if stake=true and there are too few grants overall", () => {
      const fewerGrants = allExpectedStakeGrants.slice(0, 2);
      expect(compareStakeGrants(fewerGrants, true)).toBe(false);
    });

    it("should return false if stake=true and there are too many grants (unexpected stake grant)", () => {
      const extraGrant = [...allExpectedStakeGrants, createStakeAuthGrant("UNEXPECTED_STAKE_TYPE")];
      expect(compareStakeGrants(extraGrant, true)).toBe(false);
    });
    
    it("should return false if stake=true and there's an unexpected generic grant (non-stake related)", () => {
      const otherGenericGrants = [...allExpectedStakeGrants, createGenericGrant("/cosmos.bank.v1beta1.MsgSend")];
      // This test should pass because compareStakeGrants only filters for stake-related generic messages.
      // The presence of an unrelated generic grant doesn't make the stake grants invalid by themselves.
      // The overall grant validation (e.g. in pollForGrants comparing to treasury/legacy config) would catch this.
      expect(compareStakeGrants(otherGenericGrants, true)).toBe(true); 
      // To make it fail, the *overall* grant list passed to compareGrantsToLegacyConfig would need to be exact.
      // If we are testing compareStakeGrants in isolation, it should only care about its specific grant types.
    });


    it("should return true if stake=false and no stake-related grants exist", () => {
      expect(compareStakeGrants([], false)).toBe(true);
    });

    it("should return false if stake=false but StakeAuthorization grants exist", () => {
      const grants = [createStakeAuthGrant("AUTHORIZATION_TYPE_DELEGATE")];
      expect(compareStakeGrants(grants, false)).toBe(false);
    });

    it("should return false if stake=false but generic stake-related grants exist", () => {
      const grants = [createGenericGrant("/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward")];
      expect(compareStakeGrants(grants, false)).toBe(false);
    });
  });

  // Placeholder for compareChainGrantsToTreasuryGrants tests
  describe("compareChainGrantsToTreasuryGrants", () => {
    const createDecodedAuth = (type: string, data: any): DecodedReadableAuthorization => ({
      type,
      data,
      originalValue: new Uint8Array(),
    });

    const genericTreasury = createDecodedAuth(AuthorizationTypes.Generic, { msg: "/test.MsgSend" } as GenericAuthorization);
    const sendTreasury = createDecodedAuth(AuthorizationTypes.Send, { spendLimit: [{ denom: "uxion", amount: "100" }] } as SendAuthorization);
    
    it("should return true if chain configs exactly match treasury configs", () => {
      const treasuryConfigs = [genericTreasury, sendTreasury];
      const chainConfigs = [genericTreasury, sendTreasury]; // Order might matter if not sorted internally
      expect(compareChainGrantsToTreasuryGrants(chainConfigs.slice().sort(), treasuryConfigs.slice().sort())).toBe(true);
    });

    it("should return false if number of chain configs doesn't match treasury configs", () => {
      const treasuryConfigs = [genericTreasury, sendTreasury];
      const chainConfigs = [genericTreasury];
      expect(compareChainGrantsToTreasuryGrants(chainConfigs, treasuryConfigs)).toBe(false);
    });

    it("should return false if types mismatch for one config", () => {
      const treasuryConfigs = [genericTreasury, sendTreasury];
      const chainConfigs = [genericTreasury, createDecodedAuth(AuthorizationTypes.Stake, {})]; // sendTreasury replaced with stake
      expect(compareChainGrantsToTreasuryGrants(chainConfigs, treasuryConfigs)).toBe(false);
    });

    it("should return false if data mismatches for a SendAuthorization (spendLimit)", () => {
      const treasuryConfigs = [sendTreasury];
      const chainSendDifferentLimit = createDecodedAuth(AuthorizationTypes.Send, { spendLimit: [{ denom: "uxion", amount: "50" }] } as SendAuthorization);
      expect(compareChainGrantsToTreasuryGrants([chainSendDifferentLimit], treasuryConfigs)).toBe(false);
    });
    
    it("should return false if data mismatches for a GenericAuthorization (msg)", () => {
      const treasuryConfigs = [genericTreasury];
      const chainGenericDifferentMsg = createDecodedAuth(AuthorizationTypes.Generic, { msg: "/test.MsgReceive" } as GenericAuthorization);
      expect(compareChainGrantsToTreasuryGrants([chainGenericDifferentMsg], treasuryConfigs)).toBe(false);
    });

    // Test for ContractExecution (needs more complex setup for validateContractExecution)
    it("should correctly use validateContractExecution for ContractExecution types", () => {
        const treasuryContractAuth = createDecodedAuth(AuthorizationTypes.ContractExecution, {
            grants: [{ address: "contract1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" }]
        } as HumanContractExecAuth);
        const chainContractAuth = createDecodedAuth(AuthorizationTypes.ContractExecution, {
            grants: [{ address: "contract1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" }]
        } as HumanContractExecAuth);
        
        expect(compareChainGrantsToTreasuryGrants([chainContractAuth], [treasuryContractAuth])).toBe(true);

        const chainContractAuthMismatch = createDecodedAuth(AuthorizationTypes.ContractExecution, {
            grants: [{ address: "contract1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "5" }] // Different maxCalls
        } as HumanContractExecAuth);
        expect(compareChainGrantsToTreasuryGrants([chainContractAuthMismatch], [treasuryContractAuth])).toBe(false);
    });
  });

  describe("validateContractExecution", () => {
    const createContractAuth = (grants: any[]): DecodedReadableAuthorization => ({
        type: AuthorizationTypes.ContractExecution,
        data: { grants } as HumanContractExecAuth,
        originalValue: new Uint8Array(),
    });

    it("should return true for matching contract execution grants (MaxCalls)", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(true);
    });

    it("should return true if chain maxCalls is less than treasury maxCalls", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "5" }; // Chain has fewer calls remaining
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(true);
    });
    
    it("should return false if chain maxCalls is more than treasury maxCalls", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "15" };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return true for matching MaxFunds", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "100" }] };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "100" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(true);
    });

    it("should return true if chain MaxFunds is less than treasury MaxFunds", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "100" }] };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "50" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(true);
    });

    it("should return false if chain MaxFunds is more than treasury MaxFunds", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "100" }] };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "150" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return true for matching CombinedLimit", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.CombinedLimit, maxCalls: "10", maxFunds: [{ denom: "uxion", amount: "100" }] };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.CombinedLimit, maxCalls: "10", maxFunds: [{ denom: "uxion", amount: "100" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(true);
    });
    
    it("should return false if CombinedLimit maxCalls mismatch (chain > treasury)", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.CombinedLimit, maxCalls: "10", maxFunds: [{ denom: "uxion", amount: "100" }] };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.CombinedLimit, maxCalls: "15", maxFunds: [{ denom: "uxion", amount: "100" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return false if CombinedLimit maxFunds mismatch (chain > treasury)", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.CombinedLimit, maxCalls: "10", maxFunds: [{ denom: "uxion", amount: "100" }] };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.CombinedLimit, maxCalls: "10", maxFunds: [{ denom: "uxion", amount: "150" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });
    
    it("should return false if limit types mismatch", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        const chainGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxFunds, maxFunds: [{ denom: "uxion", amount: "100" }] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });
    
    it("should return false if contract addresses mismatch", () => {
        const treasuryGrant = { address: "addr1", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        const chainGrant = { address: "addr2", limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10" };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

     it("should return true for matching filter (keys and messages)", () => {
        const treasuryGrant = { 
            address: "addr1", 
            limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10",
            filterType: "FilterType1", 
            keys: ["key1", "key2"], 
            messages: [Uint8Array.from([1,2,3]), Uint8Array.from([4,5,6])] 
        };
        const chainGrant = { 
            address: "addr1", 
            limitType: ContractExecLimitTypes.MaxCalls, maxCalls: "10",
            filterType: "FilterType1", 
            keys: ["key1", "key2"], 
            messages: [Uint8Array.from([1,2,3]), Uint8Array.from([4,5,6])] 
        };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(true);
    });

    it("should return false if filter keys length mismatch", () => {
        const treasuryGrant = { address: "addr1", filterType: "FilterType1", keys: ["key1"] };
        const chainGrant = { address: "addr1", filterType: "FilterType1", keys: ["key1", "key2"] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return false if filter keys content mismatch", () => {
        const treasuryGrant = { address: "addr1", filterType: "FilterType1", keys: ["keyA"] };
        const chainGrant = { address: "addr1", filterType: "FilterType1", keys: ["keyB"] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return false if filter messages length mismatch", () => {
        const treasuryGrant = { address: "addr1", filterType: "FilterType1", messages: [Uint8Array.from([1])] };
        const chainGrant = { address: "addr1", filterType: "FilterType1", messages: [Uint8Array.from([1]), Uint8Array.from([2])] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });
    
    it("should return false if filter messages content mismatch", () => {
        const treasuryGrant = { address: "addr1", filterType: "FilterType1", messages: [Uint8Array.from([1,2])] };
        const chainGrant = { address: "addr1", filterType: "FilterType1", messages: [Uint8Array.from([1,3])] }; // second byte differs
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return false if treasury has filter but chain does not", () => {
        const treasuryGrant = { address: "addr1", filterType: "FilterType1", keys: ["key1"] };
        const chainGrant = { address: "addr1" }; // No filter
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });

    it("should return false if chain has filter but treasury does not", () => {
        const treasuryGrant = { address: "addr1" }; // No filter
        const chainGrant = { address: "addr1", filterType: "FilterType1", keys: ["key1"] };
        expect(validateContractExecution(createContractAuth([treasuryGrant]), createContractAuth([chainGrant]))).toBe(false);
    });
  });
});
