/**
 * @jest-environment jsdom
 */
import { TextEncoder, TextDecoder } from "text-encoding";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { AbstraxionAuth } from "../src/AbstraxionAuth";
import {
  mockAccountAddress,
  mockContractAddress,
  mockGrantsResponse,
  mockGrantsResponseForTreasury,
  mockLegacyConfig,
} from "./mockData/grantResponses";
import {
  MockStorageStrategy,
  MockRedirectStrategy,
} from "./mockData/mockStrategies";
import { DecodeAuthorizationResponse } from "@/types";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

/**
 * Helper function to configure the AbstraxionAuth instance
 */
const configureAbstraxionAuthInstance = (abstraxionAuth: AbstraxionAuth) => {
  const rpcUrl = "https://testnet-rpc.xion-api.com:443";
  const restUrl = "https://testnet-api.xion-api.com:443";
  const grantContracts = mockLegacyConfig.grantContracts;
  const stake = true;
  const bank = mockLegacyConfig.bank;

  abstraxionAuth.configureAbstraxionInstance(
    rpcUrl,
    restUrl,
    grantContracts,
    stake,
    bank,
  );
};

describe("AbstraxionAuth", () => {
  let abstraxionAuth: AbstraxionAuth;
  let cosmwasmClient: jest.Mocked<CosmWasmClient>;
  let mockStorage: MockStorageStrategy;
  let mockRedirect: MockRedirectStrategy;

  beforeEach(async () => {
    mockStorage = new MockStorageStrategy();
    mockRedirect = new MockRedirectStrategy();
    abstraxionAuth = new AbstraxionAuth(
      new MockStorageStrategy(),
      new MockRedirectStrategy(),
    );

    cosmwasmClient = jest.createMockFromModule("@cosmjs/cosmwasm-stargate");
    abstraxionAuth.getCosmWasmClient = jest
      .fn()
      .mockResolvedValue(cosmwasmClient);

    cosmwasmClient.queryContractSmart = jest.fn();
    // abstraxionAuth.decodeAuthorization = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockRedirect.reset();
  });

  describe("constructor", () => {
    it("should initialize correctly", () => {
      expect(abstraxionAuth).toBeInstanceOf(AbstraxionAuth);
    });
  });

  describe("login", () => {
    it("should generate a new keypair and redirect to the dashboard when neither keypair nor granter exist", async () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      // Simulate undefined keypair and granter
      const getLocalKeypairMock = jest
        .spyOn(abstraxionAuth, "getLocalKeypair")
        .mockResolvedValueOnce(undefined);
      const getGranterMock = jest
        .spyOn(abstraxionAuth, "getGranter")
        .mockResolvedValueOnce("");

      const generateAndStoreTempAccountMock = jest
        .spyOn(abstraxionAuth, "generateAndStoreTempAccount")
        .mockResolvedValueOnce({
          getAccounts: () => Promise.resolve([{ address: "keypairAddress" }]),
        } as any);
      const pollForGrantsMock = jest.spyOn(abstraxionAuth, "pollForGrants");

      // Call the function
      await abstraxionAuth.login();

      // Assertions - assert that instance enters "newKeypairFlow" and doesn't poll
      expect(getLocalKeypairMock).toHaveBeenCalled();
      expect(getGranterMock).toHaveBeenCalled();
      expect(generateAndStoreTempAccountMock).toHaveBeenCalled();
      expect(pollForGrantsMock).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should poll for grants when both keypair and granter exist", async () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      // Simulate mock keypair and granter address
      const getLocalKeypairMock = jest
        .spyOn(abstraxionAuth, "getLocalKeypair")
        .mockResolvedValueOnce({
          getAccounts: () => Promise.resolve([{ address: "keypairAddress" }]),
        } as any);
      const getGranterMock = jest
        .spyOn(abstraxionAuth, "getGranter")
        .mockResolvedValueOnce("granterAddress");

      const pollForGrantsMock = jest
        .spyOn(abstraxionAuth, "pollForGrants")
        .mockResolvedValueOnce(true);
      const generateAndStoreTempAccountMock = jest.spyOn(
        abstraxionAuth,
        "generateAndStoreTempAccount",
      );

      // Call the function
      await abstraxionAuth.login();

      // Assertions - assert that instance polls and doesn't enter "newKeypairFlow"
      expect(getLocalKeypairMock).toHaveBeenCalled();
      expect(getGranterMock).toHaveBeenCalled();
      expect(pollForGrantsMock).toHaveBeenCalledWith(
        "keypairAddress",
        "granterAddress",
      );
      expect(generateAndStoreTempAccountMock).not.toHaveBeenCalled();
    });
  });

  describe("compareGrantsToLegacyConfig", () => {
    it("should return true when legacy config grants match on-chain grants", () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      const result =
        abstraxionAuth.compareGrantsToLegacyConfig(mockGrantsResponse);
      expect(result).toBe(true);
    });

    it("should return false when legacy config grants do not match on-chain grants - bank amount change", () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      abstraxionAuth.bank = [{ denom: "uxion", amount: "200" }];

      const result =
        abstraxionAuth.compareGrantsToLegacyConfig(mockGrantsResponse);
      expect(result).toBe(false);
    });

    it("should return false when legacy config grants do not match on-chain grants - grant contracts change", () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      abstraxionAuth.grantContracts = [
        {
          address: mockAccountAddress,
          amounts: [{ denom: "uxion", amount: "1000000" }],
        },
      ];

      const result =
        abstraxionAuth.compareGrantsToLegacyConfig(mockGrantsResponse);
      expect(result).toBe(false);
    });

    it("should return false when legacy config grants do not match on-chain grants - grant contract spend limit change", () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      abstraxionAuth.grantContracts = [
        {
          address: mockContractAddress,
          amounts: [{ denom: "uxion", amount: "2000000" }],
        },
      ];

      const result =
        abstraxionAuth.compareGrantsToLegacyConfig(mockGrantsResponse);
      expect(result).toBe(false);
    });

    it("should return true when legacy config stake changes from true to false", () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      abstraxionAuth.stake = false;

      const result =
        abstraxionAuth.compareGrantsToLegacyConfig(mockGrantsResponse);
      expect(result).toBe(true);
    });

    it("should return false when the treasury instance has changed (grants returned from chain don't match)", async () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      abstraxionAuth.treasury =
        "xion1qmxgcd4429ypkz7rejga2uya5fr88jlgkl03zvy2vg5e3y60hplq8yru7p"; // MsgSend w/ GenericAuth

      cosmwasmClient.queryContractSmart
        .mockResolvedValueOnce(["/cosmos.bank.v1beta1.MsgSend"])
        .mockResolvedValueOnce({
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: { msg: "/cosmos.bank.v1beta1.MsgSend" }, // ChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5k
          },
        });

      // Incorrect treasury config
      jest
        .spyOn(abstraxionAuth, "decodeAuthorization")
        .mockImplementation((typeUrl: string, value: string) => {
          if (typeUrl === "/cosmos.authz.v1beta1.GenericAuthorization") {
            return { msg: "someIncorrectMsg" };
          }
          if (typeUrl === "/cosmos.bank.v1beta1.SendAuthorization") {
            return {
              spendLimit: "1000uxion",
              allowList: ["address1"],
            };
          }
          if (typeUrl === "/cosmos.staking.v1beta1.StakeAuthorization") {
            return {
              authorizationType: "1",
              maxTokens: "5000uxion",
              allowList: ["validator1"],
              denyList: [],
            };
          }
          return null;
        });

      const result =
        await abstraxionAuth.compareGrantsToTreasury(mockGrantsResponse);
      expect(result).toBe(false);
    });

    it("should return true when the treasury instance hasn't changed (grants returned from chain match)", async () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      abstraxionAuth.treasury =
        "xion1qmxgcd4429ypkz7rejga2uya5fr88jlgkl03zvy2vg5e3y60hplq8yru7p"; // MsgSend w/ GenericAuth

      cosmwasmClient.queryContractSmart
        .mockResolvedValueOnce(["/cosmos.bank.v1beta1.MsgSend"])
        .mockResolvedValueOnce({
          authorization: {
            type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: { msg: "/cosmos.bank.v1beta1.MsgSend" }, // ChwvY29zbW9zLmJhbmsudjFiZXRhMS5Nc2dTZW5k
          },
        });

      jest
        .spyOn(abstraxionAuth, "decodeAuthorization")
        .mockImplementation((typeUrl: string, value: string) => {
          if (typeUrl === "/cosmos.authz.v1beta1.GenericAuthorization") {
            return { msg: "/cosmwasm.wasm.v1.MsgSend" };
          }
          {
            /* ... */
          }
          return null;
        });

      const result = await abstraxionAuth.compareGrantsToTreasury(
        mockGrantsResponseForTreasury,
      );
      expect(result).toBe(true);
    });

    it("should return false when no grants are found", () => {
      configureAbstraxionAuthInstance(abstraxionAuth);

      // Empty grants response
      const emptyGrantsResponse = {
        grants: [],
        pagination: {
          next_key: null,
          total: "0"
        }
      };

      const result = abstraxionAuth.compareGrantsToLegacyConfig(emptyGrantsResponse);
      expect(result).toBe(false);
    });
  });

  describe("validateContractExecution", () => {
    it("should return true when decoded grants match the chain grants", () => {
      const decodedAuthorization: DecodeAuthorizationResponse = {
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

      const chainAuthorization = {
        grants: [
          {
            contract:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limit: {
              "@type": "/cosmwasm.wasm.v1.CombinedLimit",
              calls_remaining: "1000",
              amounts: [
                {
                  denom: "uxion",
                  amount: "1000000",
                },
              ],
            },
            filter: {
              "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          },
          {
            contract:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limit: {
              "@type": "/cosmwasm.wasm.v1.CombinedLimit",
              calls_remaining: "1000",
              amounts: [
                {
                  denom:
                    "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4",
                  amount: "10000",
                },
              ],
            },
            filter: {
              "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          },
        ],
      };

      const result = abstraxionAuth.validateContractExecution(
        decodedAuthorization,
        chainAuthorization,
      );

      expect(result).toBe(true);
    });

    it("should return false when decoded grants do not match the chain grants", () => {
      const decodedAuthorization: DecodeAuthorizationResponse = {
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

      const chainAuthorization = {
        grants: [
          {
            contract:
              "xion1h30469h4au9thlakd5j9yf0vn2cdcuwx3krhljrjvdgtjqcjuxvq6wvm5k",
            limit: {
              "@type": "/cosmwasm.wasm.v1.CombinedLimit",
              calls_remaining: "1000",
              amounts: [
                {
                  denom: "uxion",
                  amount: "1000000",
                },
              ],
            },
            filter: {
              "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
            },
          },
        ],
      };

      const result = abstraxionAuth.validateContractExecution(
        decodedAuthorization,
        chainAuthorization,
      );

      expect(result).toBe(false);
    });
  });

  describe("mainnet integration", () => {
    it("should poll for grants on mainnet with real addresses", async () => {
      // Create a new instance without mocking the CosmWasmClient
      const mainnetAbstraxionAuth = new AbstraxionAuth(
        new MockStorageStrategy(),
        new MockRedirectStrategy(),
      );

      // Configure with mainnet endpoints
      const rpcUrl = "https://rpc.xion-mainnet-1.burnt.com:443";
      const restUrl = "https://api.xion-mainnet-1.burnt.com:443";
      const treasury = "xion1jmmlgu07y9ypvsa0rdu7tdkygx7v9gc5k9v9qysw4q5wwq4vvmjsscrkrg";
      const sessionKey = "xion1p2lh0ejzc6g3zl4gjdfk2lqpujcpmz4mav850z"; // This is the grantee
      const smartAccount = "xion1n7r6sxu7c3gh6pfnk49mdtj5upzqg7lav4ckgps9p20py8a2st0sdq3jc7"; // This is the granter

      // Configure the instance with mainnet settings
      mainnetAbstraxionAuth.configureAbstraxionInstance(
        rpcUrl,
        restUrl,
        undefined, // No specific grant contracts
        false,     // Enable stake
        undefined, // No specific bank limits
        undefined, // No callback URL
        treasury  // Set the treasury address
      );

      // Real grants response from mainnet
      const realGrantsResponse = {
        grants: [
          {
            authorization: {
              "@type": "/cosmos.bank.v1beta1.SendAuthorization",
              spend_limit: [
                {
                  denom: "uxion",
                  amount: "25000000000"
                }
              ],
              allow_list: [
                "xion1z9ef3z67wuywxun9hjhfgjgczsv7mhkdq9jsut"
              ]
            },
            expiration: "2025-07-13T16:32:21Z"
          }
        ],
        pagination: {
          next_key: null,
          total: "1"
        }
      };

      // Mock the CosmWasmClient for treasury queries
      const mockCosmWasmClient = {
        queryContractSmart: jest.fn()
          .mockResolvedValueOnce(["/cosmos.bank.v1beta1.MsgSend"]) // First call for grant_config_type_urls
          .mockResolvedValueOnce({
            description: 'Authorize transfer of XION for presale purchase',
            authorization: {
              type_url: '/cosmos.bank.v1beta1.SendAuthorization',
              value: 'ChQKBXV4aW9uEgsyNTAwMDAwMDAwMBIreGlvbjF6OWVmM3o2N3d1eXd4dW45aGpoZmdqZ2N6c3Y3bWhrZHE5anN1dA=='
            },
            optional: false
          })
      };

      // Mock the getCosmWasmClient method
      jest.spyOn(mainnetAbstraxionAuth, 'getCosmWasmClient').mockResolvedValue(mockCosmWasmClient as any);

      // Mock the fetch call to return a real grants response
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.toString().includes('/cosmos/authz/v1beta1/grants')) {
          return Promise.resolve({
            json: () => Promise.resolve(realGrantsResponse)
          });
        }
      });

      // Poll for grants between the session key (grantee) and smart account (granter)
      const result = await mainnetAbstraxionAuth.pollForGrants(sessionKey, smartAccount);

      // We expect the poll to succeed if the grants exist
      expect(result).toBe(true);
    });
    
    it("should poll for grants on mainnet with allow_list", async () => {
      // Create a new instance without mocking the CosmWasmClient
      const mainnetAbstraxionAuth = new AbstraxionAuth(
        new MockStorageStrategy(),
        new MockRedirectStrategy(),
      );

      // Configure with mainnet endpoints
      const rpcUrl = "https://rpc.xion-mainnet-1.burnt.com:443";
      const restUrl = "https://api.xion-mainnet-1.burnt.com:443";
      const treasury = "xion1y69y5p86qy8awezg2edhq2wclr9m6ucva9xdwk0leqs6mq00f5fsy7554z";
      const sessionKey = "xion18cwx77ur8lze7l0rmksw5n7vx33mnpsza43gq2"; // This is the grantee
      const smartAccount = "xion1n7r6sxu7c3gh6pfnk49mdtj5upzqg7lav4ckgps9p20py8a2st0sdq3jc7"; // This is the granter

      // Configure the instance with mainnet settings
      mainnetAbstraxionAuth.configureAbstraxionInstance(
        rpcUrl,
        restUrl,
        undefined, // No specific grant contracts
        false,     // Enable stake
        undefined, // No specific bank limits
        undefined, // No callback URL
        treasury  // Set the treasury address
      );

      // Real grants response from mainnet
      const realGrantsResponse = {
        grants: [
          {
            authorization: {
              "@type": "/cosmos.bank.v1beta1.SendAuthorization",
              spend_limit: [
                {
                  denom: "uxion",
                  amount: "1000"
                },
                {
                  denom: "atom",
                  amount: "1000"
                }
              ],
              allow_list: [
                "xion1n7r6sxu7c3gh6pfnk49mdtj5upzqg7lav4ckgps9p20py8a2st0sdq3jc7",
                "xion1p2lh0ejzc6g3zl4gjdfk2lqpujcpmz4mav850z"
              ]
            },
            expiration: "2025-07-13T17:12:01Z"
          }
        ],
        pagination: {
          next_key: null,
          total: "1"
        }
      };

      // Mock the CosmWasmClient for treasury queries
      const mockCosmWasmClient = {
        queryContractSmart: jest.fn()
          .mockResolvedValueOnce(["/cosmos.bank.v1beta1.MsgSend"]) // First call for grant_config_type_urls
          .mockResolvedValueOnce({ // Second call for grant_config_by_type_url
            description: 'Test',
            authorization: {
              type_url: '/cosmos.bank.v1beta1.SendAuthorization',
              value: 'Cg0KBXV4aW9uEgQxMDAwCgwKBGF0b20SBDEwMDASP3hpb24xbjdyNnN4dTdjM2doNnBmbms0OW1kdGo1dXB6cWc3bGF2NGNrZ3BzOXAyMHB5OGEyc3Qwc2RxM2pjNxIreGlvbjFwMmxoMGVqemM2ZzN6bDRnamRmazJscXB1amNwbXo0bWF2ODUweg=='
            },
            optional: false
          })
      };

      // Mock the getCosmWasmClient method
      jest.spyOn(mainnetAbstraxionAuth, 'getCosmWasmClient').mockResolvedValue(mockCosmWasmClient as any);

      // Mock the fetch call to return a real grants response
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.toString().includes('/cosmos/authz/v1beta1/grants')) {
          return Promise.resolve({
            json: () => Promise.resolve(realGrantsResponse)
          });
        }
      });

      // Poll for grants between the session key (grantee) and smart account (granter)
      const result = await mainnetAbstraxionAuth.pollForGrants(sessionKey, smartAccount);

      // We expect the poll to succeed if the grants exist
      expect(result).toBe(true);
    });

    it("should handle empty grants response when polling between sessionKey and smartAccount", async () => {
      // Create a new instance without mocking the CosmWasmClient
      const mainnetAbstraxionAuth = new AbstraxionAuth(
        new MockStorageStrategy(),
        new MockRedirectStrategy(),
      );

      // Configure with mainnet endpoints
      const rpcUrl = "https://rpc.xion-mainnet-1.burnt.com:443";
      const restUrl = "https://api.xion-mainnet-1.burnt.com:443";
      const treasury = "xion1jmmlgu07y9ypvsa0rdu7tdkygx7v9gc5k9v9qysw4q5wwq4vvmjsscrkrg";
      const sessionKey = "xion1p2lh0ejzc6g3zl4gjdfk2lqpujcpmz4mav850z"; // This is the grantee
      const smartAccount = "xion1n7r6sxu7c3gh6pfnk49mdtj5upzqg7lav4ckgps9p20py8a2st0sdq3jc7"; // This is the granter

      // Configure the instance with mainnet settings
      mainnetAbstraxionAuth.configureAbstraxionInstance(
        rpcUrl,
        restUrl,
        undefined, // No specific grant contracts
        false,     // Enable stake
        undefined, // No specific bank limits
        undefined, // No callback URL
        treasury  // Set the treasury address
      );

      // Empty grants response
      const emptyGrantsResponse = {
        grants: [],
        pagination: {
          next_key: null,
          total: "0"
        }
      };

      // Mock the CosmWasmClient for treasury queries
      const mockCosmWasmClient = {
        queryContractSmart: jest.fn()
          .mockResolvedValueOnce(["/cosmos.bank.v1beta1.MsgSend"]) // First call for grant_config_type_urls
          .mockResolvedValueOnce({ // Second call for grant_config_by_type_url
            description: 'Test',
            authorization: {
              type_url: '/cosmos.bank.v1beta1.SendAuthorization',
              value: 'Cg0KBXV4aW9uEgQxMDAwCgwKBGF0b20SBDEwMDASP3hpb24xbjdyNnN4dTdjM2doNnBmbms0OW1kdGo1dXB6cWc3bGF2NGNrZ3BzOXAyMHB5OGEyc3Qwc2RxM2pjNxIreGlvbjFwMmxoMGVqemM2ZzN6bDRnamRmazJscXB1amNwbXo0bWF2ODUweg=='
            },
            optional: false
          })
      };

      // Mock the getCosmWasmClient method
      jest.spyOn(mainnetAbstraxionAuth, 'getCosmWasmClient').mockResolvedValue(mockCosmWasmClient as any);

      // Mock the fetch call to return an empty grants response
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.toString().includes('/cosmos/authz/v1beta1/grants')) {
          return Promise.resolve({
            json: () => Promise.resolve(emptyGrantsResponse)
          });
        }
      });

      // Poll for grants between the session key (grantee) and smart account (granter)
      const result = await mainnetAbstraxionAuth.pollForGrants(sessionKey, smartAccount);

      // We expect the poll to return false when no grants are found
      expect(result).toBe(false);
    });
  });
});
