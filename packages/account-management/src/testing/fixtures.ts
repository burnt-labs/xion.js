/**
 * Test fixtures for @burnt-labs/account-management
 *
 * Mock data for treasury configurations, grant configs, and contract responses.
 * Colocated with the package to ensure type safety and avoid circular dependencies.
 *
 * @packageDocumentation
 */

/**
 * Mock treasury parameters (returned from treasury contracts)
 */
export const mockTreasuryParams = {
  /**
   * Basic treasury params with standard URLs
   */
  basic: {
    redirect_url: "https://dashboard.burnt.com",
    icon_url: "https://dashboard.burnt.com/icon.png",
    metadata: "Test Treasury",
  },

  /**
   * Treasury with custom metadata (JSON stringified)
   */
  withCustomMetadata: {
    redirect_url: "https://example.com/dapp",
    icon_url: "https://example.com/icon.png",
    metadata: JSON.stringify({
      name: "Example DApp",
      description: "A test decentralized application",
      version: "1.0.0",
    }),
  },
};

/**
 * Mock grant type URLs (Cosmos SDK message types for authz/feegrant)
 */
export const mockGrantTypeUrls = {
  genericAuthorization: "/cosmos.authz.v1beta1.GenericAuthorization",
  sendAuthorization: "/cosmos.bank.v1beta1.SendAuthorization",
  stakeAuthorization: "/cosmos.staking.v1beta1.StakeAuthorization",
  basicAllowance: "/cosmos.feegrant.v1beta1.BasicAllowance",
  periodicAllowance: "/cosmos.feegrant.v1beta1.PeriodicAllowance",
};

/**
 * Mock grant configurations (as returned from treasury contracts)
 */
export const mockGrantConfigs = {
  /**
   * Generic authorization for executing smart contracts
   */
  genericExecute: {
    authorization: {
      type_url: mockGrantTypeUrls.genericAuthorization,
      value: Buffer.from(
        JSON.stringify({
          msg: "/cosmwasm.wasm.v1.MsgExecuteContract",
        }),
      ).toString("base64"),
    },
    description: "Execute smart contracts",
    optional: false,
  },

  /**
   * Send authorization for bank transfers
   */
  send: {
    authorization: {
      type_url: mockGrantTypeUrls.sendAuthorization,
      value: Buffer.from(
        JSON.stringify({
          spend_limit: [{ denom: "uxion", amount: "1000000" }],
        }),
      ).toString("base64"),
    },
    description: "Send tokens",
    optional: true,
  },

  /**
   * Staking authorization for delegation
   */
  staking: {
    authorization: {
      type_url: mockGrantTypeUrls.stakeAuthorization,
      value: Buffer.from(
        JSON.stringify({
          authorization_type: "AUTHORIZATION_TYPE_DELEGATE",
          max_tokens: { denom: "uxion", amount: "5000000" },
        }),
      ).toString("base64"),
    },
    description: "Delegate tokens to validators",
    optional: true,
  },

  /**
   * Fee grant with basic allowance
   */
  feeGrant: {
    authorization: {
      type_url: mockGrantTypeUrls.basicAllowance,
      value: Buffer.from(
        JSON.stringify({
          spend_limit: [{ denom: "uxion", amount: "100000" }],
        }),
      ).toString("base64"),
    },
    description: "Cover transaction fees",
    optional: false,
    allowance: {
      type_url: mockGrantTypeUrls.basicAllowance,
      value: Buffer.from(
        JSON.stringify({
          spend_limit: [{ denom: "uxion", amount: "100000" }],
        }),
      ).toString("base64"),
    },
    maxDuration: 86400, // 24 hours in seconds
  },
};

/**
 * Mock complete treasury configurations
 */
export const mockTreasuryConfigs = {
  /**
   * Basic treasury with minimal grants (execute + fee grant)
   */
  basic: {
    grantConfigs: [mockGrantConfigs.genericExecute, mockGrantConfigs.feeGrant],
    params: mockTreasuryParams.basic,
  },

  /**
   * Full treasury with all grant types
   */
  full: {
    grantConfigs: [
      mockGrantConfigs.genericExecute,
      mockGrantConfigs.send,
      mockGrantConfigs.staking,
      mockGrantConfigs.feeGrant,
    ],
    params: mockTreasuryParams.basic,
  },

  /**
   * Treasury with only optional grants
   */
  optionalOnly: {
    grantConfigs: [
      { ...mockGrantConfigs.send, optional: true },
      { ...mockGrantConfigs.staking, optional: true },
    ],
    params: mockTreasuryParams.basic,
  },

  /**
   * Custom dApp treasury configuration
   */
  customDapp: {
    grantConfigs: [mockGrantConfigs.genericExecute],
    params: mockTreasuryParams.withCustomMetadata,
  },
};

/**
 * Mock treasury contract query responses
 */
export const mockTreasuryContractResponses = {
  /**
   * Response for grant_config_type_urls query
   */
  typeUrlsResponse: {
    basic: [
      mockGrantTypeUrls.genericAuthorization,
      mockGrantTypeUrls.basicAllowance,
    ],
    full: [
      mockGrantTypeUrls.genericAuthorization,
      mockGrantTypeUrls.sendAuthorization,
      mockGrantTypeUrls.stakeAuthorization,
      mockGrantTypeUrls.basicAllowance,
    ],
    empty: [],
  },

  /**
   * Response for grant_config_by_type_url query
   */
  grantConfigByTypeUrl: {
    genericExecute: mockGrantConfigs.genericExecute,
    send: mockGrantConfigs.send,
    staking: mockGrantConfigs.staking,
    feeGrant: mockGrantConfigs.feeGrant,
  },

  /**
   * Response for params query
   */
  paramsResponse: mockTreasuryParams.basic,

  /**
   * Error responses
   */
  errors: {
    contractNotFound: {
      error: "contract: not found",
    },
    invalidQuery: {
      error: "query wasm contract failed: invalid request",
    },
    noGrantConfigs: {
      error: "no grant configs found",
    },
  },
};

/**
 * Mock DAO DAO treasury responses
 * DAO DAO treasuries have a different structure
 */
export const mockDaoTreasuryResponses = {
  /**
   * Basic DAO DAO treasury configuration
   */
  basic: {
    config: {
      name: "Test DAO Treasury",
      description: "A test DAO treasury",
      automatically_add_cw20s: false,
      automatically_add_cw721s: false,
    },
    grant_configs: mockTreasuryConfigs.basic.grantConfigs,
    params: mockTreasuryParams.basic,
  },

  /**
   * DAO DAO with sub-DAOs
   */
  withSubDaos: {
    config: {
      name: "Main DAO Treasury",
      description: "Main DAO with sub-DAOs",
      sub_daos: ["xion1subdao1address", "xion1subdao2address"],
    },
    grant_configs: mockTreasuryConfigs.full.grantConfigs,
    params: mockTreasuryParams.basic,
  },
};

/**
 * Mock permission descriptions (formatted for UI display)
 */
export const mockPermissionDescriptions = {
  execute: {
    authorizationDescription: "Execute smart contracts",
    dappDescription:
      "Allow the dApp to execute contract actions on your behalf",
    contracts: ["xion1contract1", "xion1contract2"],
  },

  send: {
    authorizationDescription: "Send tokens (max: 1 XION)",
    dappDescription: "Allow the dApp to send up to 1 XION from your account",
  },

  feeGrant: {
    authorizationDescription: "Cover transaction fees (max: 0.1 XION)",
    dappDescription: "The dApp will pay transaction fees on your behalf",
  },

  staking: {
    authorizationDescription: "Delegate tokens (max: 5 XION)",
    dappDescription: "Allow the dApp to delegate up to 5 XION to validators",
  },
};

/**
 * Known treasury addresses for testing
 */
export const testTreasuryAddresses = {
  /**
   * Test treasury on xion-testnet-2 (replace with actual)
   */
  testnet:
    "xion1sv6kdau6mvjlzkthdhpcl53e8zmhaltmgzz9jhxgkxhmpymla9gqrh0knw" as const,

  /**
   * Mock addresses for unit tests
   */
  mock: {
    basic: "xion1treasury1address" as const,
    full: "xion1treasury2address" as const,
    daoDao: "xion1daotreasury1address" as const,
  },
};
