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

  beforeEach(async () => {
    abstraxionAuth = new AbstraxionAuth();

    cosmwasmClient = jest.createMockFromModule("@cosmjs/cosmwasm-stargate");
    abstraxionAuth.getCosmWasmClient = jest
      .fn()
      .mockResolvedValue(cosmwasmClient);

    cosmwasmClient.queryContractSmart = jest.fn();
    // abstraxionAuth.decodeAuthorization = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        .mockReturnValueOnce("");

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
        .mockReturnValueOnce("granterAddress");

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
  });
});
