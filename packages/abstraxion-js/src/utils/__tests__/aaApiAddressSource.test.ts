/**
 * Signer-mode wiring for the aa-api smart-account address source.
 *
 * A signer config with only { codeId, addressPrefix } (no checksum) must
 * discover accounts through the AA API v2 strategy and create accounts with
 * the aa-api address source. A stale checksum must not change that route.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@burnt-labs/account-management", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/account-management")>();
  return {
    ...actual,
    createCompositeAccountStrategy: vi.fn(
      actual.createCompositeAccountStrategy,
    ),
  };
});

import {
  AAApiAccountStrategy,
  connectAccount,
  createCompositeAccountStrategy,
  EmptyAccountStrategy,
  RpcAccountStrategy,
} from "@burnt-labs/account-management";
import {
  createAccountCreationConfigFromConfig,
  createAccountStrategyFromConfig,
  createGrantConfigFromConfig,
  normalizeAbstraxionConfig,
} from "../normalizeAbstraxionConfig";
import type { AbstraxionConfig, SignerAuthentication } from "../../types";

const AA_API_URL = "https://aa-api.xion-testnet-2.burnt.com";
const RPC_URL = "https://rpc.xion-testnet-2.burnt.com:443";
const FEE_GRANTER = "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x";
const EVM = "0xc2e80cf7d5a108d4abc97b5c5a95b2515ef90cb5";
const CANDIDATE =
  "xion1s7q6lptjw8j22peevhwese5rernvw0v83fsupxlccjx5a9rcy3ws90atef";
const CANDIDATE_SIGNED_BYTES =
  "0x78696f6e31733771366c70746a77386a3232706565766877657365357265726e76773076383366737570786c63636a78356139726379337773393061746566";
const STALE_CHECKSUM =
  "D27A379FF65EB47A9E538E3A3D46101DE2A6C0B86BA3D0BF014C0403849414E6";

function signerConfig(
  smartAccountContract: SignerAuthentication["smartAccountContract"],
): AbstraxionConfig {
  return {
    chainId: "xion-testnet-2",
    rpcUrl: RPC_URL,
    restUrl: "https://api.xion-testnet-2.burnt.com:443",
    feeGranter: FEE_GRANTER,
    treasury: "xion1treasury",
    authentication: {
      type: "signer",
      aaApiUrl: AA_API_URL,
      getSignerConfig: vi.fn(),
      smartAccountContract,
      indexer: {
        type: "daodao",
        url: "https://indexer.example.com",
        chainId: "xion-testnet-2",
      },
      treasuryIndexer: { url: "https://daodao.example.com" },
    },
  };
}

const CONFIGS: Array<[string, SignerAuthentication["smartAccountContract"]]> = [
  ["no checksum", { codeId: 1880, addressPrefix: "xion" }],
  [
    "a stale checksum",
    { codeId: 1880, addressPrefix: "xion", checksum: STALE_CHECKSUM },
  ],
];

describe.each(CONFIGS)("signer config with %s", (_name, contract) => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.mocked(createCompositeAccountStrategy).mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function setup() {
    const config = normalizeAbstraxionConfig(signerConfig(contract));
    const signerAuth = config.authentication as SignerAuthentication;
    return { config, signerAuth };
  }

  it("builds an AA API v2-only discovery strategy", () => {
    const { config, signerAuth } = setup();

    const strategy = createAccountStrategyFromConfig(config, signerAuth);

    expect(createCompositeAccountStrategy).toHaveBeenCalledTimes(1);
    expect(createCompositeAccountStrategy).toHaveBeenCalledWith({
      aaApi: {
        baseURL: AA_API_URL,
        version: "v2",
        rpcUrl: RPC_URL,
        addressPrefix: "xion",
      },
    });
    const strategies = (strategy as any).strategies;
    expect(strategies).toHaveLength(1);
    expect(strategies[0]).toBeInstanceOf(AAApiAccountStrategy);
    expect(
      strategies.some(
        (s: unknown) =>
          s instanceof RpcAccountStrategy || s instanceof EmptyAccountStrategy,
      ),
    ).toBe(false);
  });

  it("returns a creation config without any checksum", () => {
    const { config, signerAuth } = setup();

    expect(createAccountCreationConfigFromConfig(config, signerAuth)).toEqual({
      aaApiUrl: AA_API_URL,
      smartAccountContract: { addressPrefix: "xion" },
      feeGranter: FEE_GRANTER,
    });
  });

  it("keeps the fee granter in the grant config", () => {
    const { config, signerAuth } = setup();

    expect(createGrantConfigFromConfig(config, signerAuth)).toMatchObject({
      treasury: "xion1treasury",
      feeGranter: FEE_GRANTER,
      daodaoIndexerUrl: "https://daodao.example.com",
    });
  });

  it("discovers via /check and creates the aa-api address", async () => {
    const { config, signerAuth } = setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "not found" } }), {
          status: 404,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            address: CANDIDATE,
            authenticator_type: "EthWallet",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ account_address: CANDIDATE, code_id: 1880 }),
          { status: 200 },
        ),
      );
    global.fetch = fetchMock;
    const signMessage = vi.fn().mockResolvedValue("0xsig");
    const keypair = {
      getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
    };

    const result = await connectAccount({
      connector: {
        connect: vi.fn().mockResolvedValue({
          displayAddress: EVM,
          authenticator: EVM,
          signMessage,
          metadata: { authenticatorType: "EthWallet" },
        }),
      } as any,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      accountStrategy: createAccountStrategyFromConfig(config, signerAuth),
      accountCreationConfig: createAccountCreationConfigFromConfig(
        config,
        signerAuth,
      ),
      sessionManager: {
        getLocalKeypair: vi.fn().mockResolvedValue(keypair),
      } as any,
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `${AA_API_URL}/api/v2/account/check/ethwallet/${EVM}`,
      `${AA_API_URL}/api/v2/account/address/ethwallet/${EVM}`,
      `${AA_API_URL}/api/v2/accounts/create/ethwallet`,
    ]);
    expect(signMessage).toHaveBeenCalledTimes(1);
    expect(signMessage).toHaveBeenCalledWith(CANDIDATE_SIGNED_BYTES);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      address: EVM,
      signature: "0xsig",
    });
    expect(result.smartAccountAddress).toBe(CANDIDATE);
  });
});

describe("signer config without aaApiUrl", () => {
  it("uses the network's AA API on a known chain", () => {
    const base = signerConfig({ codeId: 1880, addressPrefix: "xion" });
    const config = normalizeAbstraxionConfig({
      ...base,
      authentication: {
        ...(base.authentication as SignerAuthentication),
        aaApiUrl: "",
      },
    });

    expect((config.authentication as SignerAuthentication).aaApiUrl).toBe(
      "https://aa-api.testnet.burnt.com",
    );
  });

  it("fails fast on a custom chain instead of discovering without the AA API", () => {
    const base = signerConfig({ codeId: 1880, addressPrefix: "xion" });
    const config = normalizeAbstraxionConfig({
      ...base,
      chainId: "xion-custom-1",
      authentication: {
        ...(base.authentication as SignerAuthentication),
        aaApiUrl: "",
      },
    });

    expect(() =>
      createAccountStrategyFromConfig(
        config,
        config.authentication as SignerAuthentication,
      ),
    ).toThrow("aaApiUrl is required");
  });
});
