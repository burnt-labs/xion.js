/**
 * @jest-environment jsdom
 */
import { AbstraxionAuth } from "../src/AbstraxionAuth";
import { TextEncoder, TextDecoder } from "text-encoding";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe("AbstraxionAuth", () => {
  let abstraxionAuth: AbstraxionAuth;

  beforeEach(() => {
    abstraxionAuth = new AbstraxionAuth();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize correctly", () => {
      expect(abstraxionAuth).toBeInstanceOf(AbstraxionAuth);
    });
  });

  describe("configureAbstraxionInstance", () => {
    it("should set configuration properties", () => {
      const rpcUrl = "https://testnet-rpc.xion-api.com:443";
      const restUrl = "https://testnet-api.xion-api.com:443";
      const grantContracts = [
        {
          address:
            "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka",
          amounts: [{ denom: "uxion", amount: "1000000" }],
        },
      ];
      const stake = true;
      const bank = [
        {
          denom: "uxion",
          amount: "1000000",
        },
      ];

      abstraxionAuth.configureAbstraxionInstance(
        rpcUrl,
        restUrl,
        grantContracts,
        stake,
        bank,
      );

      expect(abstraxionAuth.grantContracts).toEqual(grantContracts);
      expect(abstraxionAuth.stake).toEqual(stake);
      expect(abstraxionAuth.bank).toEqual(bank);
    });
  });

  describe("login", () => {
    it("should generate a new keypair and redirect to the dashboard when neither keypair nor granter exist", async () => {
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

      // TODO: Track redirect

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
});
