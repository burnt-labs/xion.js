/**
 * `network` is the only chain setting a consumer needs.
 *
 * `{ network: "mainnet" | "testnet" }` must resolve the chain ID, RPC, REST,
 * gas price, fee granter, AA API URL and address prefix, and signer mode must
 * be able to discover and create accounts with nothing else configured.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  AAApiAccountStrategy,
  NumiaAccountStrategy,
} from "@burnt-labs/account-management";
import {
  createAccountCreationConfigFromConfig,
  createAccountStrategyFromConfig,
  createGrantConfigFromConfig,
  normalizeAbstraxionConfig,
} from "../normalizeAbstraxionConfig";
import { SignerController } from "../../controllers/SignerController";
import type {
  AbstraxionConfig,
  SignerAuthentication,
  XionNetwork,
} from "../../types";

const NETWORKS: Array<
  [
    XionNetwork,
    {
      chainId: string;
      rpcUrl: string;
      restUrl: string;
      aaApiUrl: string;
      feeGranter: string;
    },
  ]
> = [
  [
    "testnet",
    {
      chainId: "xion-testnet-2",
      rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
      restUrl: "https://api.xion-testnet-2.burnt.com:443",
      aaApiUrl: "https://aa-api.testnet.burnt.com",
      feeGranter: "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x",
    },
  ],
  [
    "mainnet",
    {
      chainId: "xion-mainnet-1",
      rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
      restUrl: "https://api.xion-mainnet-1.burnt.com:443",
      aaApiUrl: "https://aa-api.mainnet.burnt.com",
      feeGranter: "xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0",
    },
  ],
];

function minimalSignerConfig(
  network: XionNetwork,
  extra: Partial<AbstraxionConfig> = {},
): AbstraxionConfig {
  return {
    network,
    treasury: "xion1treasury",
    authentication: { type: "signer", getSignerConfig: vi.fn() },
    ...extra,
  };
}

function stubSessionManager() {
  return {
    getLocalKeypair: vi.fn(),
    generateAndStoreTempAccount: vi.fn(),
    getGranter: vi.fn(),
    setGranter: vi.fn(),
    authenticate: vi.fn(),
    logout: vi.fn(),
  };
}

function stubStorage() {
  return {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(NETWORKS)("network: %s only", (network, expected) => {
  it("fills every chain value from the network", () => {
    const config = normalizeAbstraxionConfig(minimalSignerConfig(network));

    expect(config.chainId).toBe(expected.chainId);
    expect(config.rpcUrl).toBe(expected.rpcUrl);
    expect(config.restUrl).toBe(expected.restUrl);
    expect(config.gasPrice).toBe("0.001uxion");
    expect(config.feeGranter).toBe(expected.feeGranter);
    expect((config.authentication as SignerAuthentication).aaApiUrl).toBe(
      expected.aaApiUrl,
    );
  });

  it("builds an AA API v2 discovery strategy", () => {
    const config = normalizeAbstraxionConfig(minimalSignerConfig(network));
    const signerAuth = config.authentication as SignerAuthentication;

    const strategy = createAccountStrategyFromConfig(config, signerAuth);
    const strategies = (strategy as any).strategies;

    expect(strategies).toHaveLength(1);
    expect(strategies[0]).toBeInstanceOf(AAApiAccountStrategy);
    expect(strategies[0]).toMatchObject({
      config: {
        baseURL: expected.aaApiUrl,
        version: "v2",
        rpcUrl: expected.rpcUrl,
        addressPrefix: "xion",
      },
    });
  });

  it("enables account creation without codeId, aaApiUrl or feeGranter", () => {
    const config = normalizeAbstraxionConfig(minimalSignerConfig(network));
    const signerAuth = config.authentication as SignerAuthentication;

    expect(createAccountCreationConfigFromConfig(config, signerAuth)).toEqual({
      aaApiUrl: expected.aaApiUrl,
      smartAccountContract: { addressPrefix: "xion" },
      feeGranter: expected.feeGranter,
    });
  });

  it("defaults the treasury indexer and grant fee granter", () => {
    const config = normalizeAbstraxionConfig(minimalSignerConfig(network));
    const signerAuth = config.authentication as SignerAuthentication;

    expect(createGrantConfigFromConfig(config, signerAuth)).toMatchObject({
      treasury: "xion1treasury",
      feeGranter: expected.feeGranter,
      daodaoIndexerUrl: "https://daodaoindexer.burnt.com",
    });
  });

  it("constructs a signer controller", () => {
    const config = normalizeAbstraxionConfig(minimalSignerConfig(network));

    expect(() =>
      SignerController.fromConfig(
        config,
        stubStorage() as any,
        stubSessionManager() as any,
      ),
    ).not.toThrow();
  });

  it("accepts a chainId that matches the network", () => {
    const config = normalizeAbstraxionConfig(
      minimalSignerConfig(network, { chainId: expected.chainId }),
    );

    expect(config.chainId).toBe(expected.chainId);
  });
});

describe("network validation", () => {
  it("rejects a chainId that conflicts with the network", () => {
    expect(() =>
      normalizeAbstraxionConfig(
        minimalSignerConfig("mainnet", { chainId: "xion-testnet-2" }),
      ),
    ).toThrow(/network "mainnet" is chain xion-mainnet-1/);
  });

  it("rejects an unknown network", () => {
    expect(() =>
      normalizeAbstraxionConfig(
        minimalSignerConfig("devnet" as unknown as XionNetwork),
      ),
    ).toThrow(/Unknown XION network "devnet"/);
  });

  it("requires a network or chainId in the browser", () => {
    vi.stubGlobal("window", {});

    expect(() =>
      normalizeAbstraxionConfig({
        authentication: { type: "signer", getSignerConfig: vi.fn() },
      }),
    ).toThrow(/network is required/);
  });

  it("does not throw without a chain during SSR", () => {
    const config = normalizeAbstraxionConfig({
      authentication: { type: "signer", getSignerConfig: vi.fn() },
    });

    expect(config.chainId).toBe("");
  });
});

describe("overrides", () => {
  it("prefer explicit values over the network defaults", () => {
    const config = normalizeAbstraxionConfig(
      minimalSignerConfig("testnet", {
        rpcUrl: "http://localhost:26657",
        restUrl: "http://localhost:1317",
        gasPrice: "0.025uxion",
        feeGranter: "xion1override",
        authentication: {
          type: "signer",
          getSignerConfig: vi.fn(),
          aaApiUrl: "http://localhost:8787",
          smartAccountContract: { addressPrefix: "test" },
        },
      }),
    );
    const signerAuth = config.authentication as SignerAuthentication;

    expect(config).toMatchObject({
      chainId: "xion-testnet-2",
      rpcUrl: "http://localhost:26657",
      restUrl: "http://localhost:1317",
      gasPrice: "0.025uxion",
      feeGranter: "xion1override",
    });
    expect(createAccountCreationConfigFromConfig(config, signerAuth)).toEqual({
      aaApiUrl: "http://localhost:8787",
      smartAccountContract: { addressPrefix: "test" },
      feeGranter: "xion1override",
    });
  });
});

describe("custom chain", () => {
  const custom = (
    authentication: Partial<SignerAuthentication> = {},
    extra: Partial<AbstraxionConfig> = {},
  ): AbstraxionConfig => ({
    chainId: "xion-custom-1",
    rpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    authentication: {
      type: "signer",
      getSignerConfig: vi.fn(),
      ...authentication,
    },
    ...extra,
  });

  it("names aaApiUrl when no AA API is known", () => {
    const config = normalizeAbstraxionConfig(custom());

    expect(() =>
      createAccountStrategyFromConfig(
        config,
        config.authentication as SignerAuthentication,
      ),
    ).toThrow(/aaApiUrl is required/);
    expect(
      createAccountCreationConfigFromConfig(
        config,
        config.authentication as SignerAuthentication,
      ),
    ).toBeUndefined();
  });

  it("names the address prefix when it can't be resolved", () => {
    const config = normalizeAbstraxionConfig(
      custom({ aaApiUrl: "http://localhost:8787" }),
    );

    expect(() =>
      createAccountStrategyFromConfig(
        config,
        config.authentication as SignerAuthentication,
      ),
    ).toThrow(/smartAccountContract.addressPrefix is required/);
  });

  it("requires a fee granter when grants are configured", () => {
    const config = normalizeAbstraxionConfig(
      custom(
        {
          aaApiUrl: "http://localhost:8787",
          smartAccountContract: { addressPrefix: "xion" },
        },
        { treasury: "xion1treasury" },
      ),
    );

    expect(() =>
      SignerController.fromConfig(
        config,
        stubStorage() as any,
        stubSessionManager() as any,
      ),
    ).toThrow(/feeGranter is required/);
  });

  it("needs no fee granter on the no-grants path", () => {
    const config = normalizeAbstraxionConfig(
      custom({
        aaApiUrl: "http://localhost:8787",
        smartAccountContract: { addressPrefix: "xion" },
      }),
    );

    expect(() =>
      SignerController.fromConfig(
        config,
        stubStorage() as any,
        stubSessionManager() as any,
      ),
    ).not.toThrow();
  });

  it("keeps indexer-only discovery when no AA API or contract is set", () => {
    const config = normalizeAbstraxionConfig(
      custom({
        indexer: { type: "numia", url: "https://indexer.example.com" },
      }),
    );
    const signerAuth = config.authentication as SignerAuthentication;

    const strategy = createAccountStrategyFromConfig(config, signerAuth);
    const strategies = (strategy as any).strategies as unknown[];

    expect(strategies[0]).toBeInstanceOf(NumiaAccountStrategy);
    expect(strategies.some((s) => s instanceof AAApiAccountStrategy)).toBe(
      false,
    );
    expect(
      createAccountCreationConfigFromConfig(config, signerAuth),
    ).toBeUndefined();
  });
});
