/**
 * Smart-account wiring: the RPC discovery strategy and account creation
 * resolve the derivation checksum from the chain, with the configured
 * checksum passed only as a pin.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@burnt-labs/account-management", async () => {
  const actual = await vi.importActual<
    typeof import("@burnt-labs/account-management")
  >("@burnt-labs/account-management");
  return {
    ...actual,
    createCompositeAccountStrategy: vi.fn(() => ({})),
  };
});

import { createCompositeAccountStrategy } from "@burnt-labs/account-management";
import {
  createAccountCreationConfigFromConfig,
  createAccountStrategyFromConfig,
} from "../normalizeAbstraxionConfig";
import type {
  NormalizedAbstraxionConfig,
  SignerAuthentication,
} from "../../types";

const config = {
  chainId: "xion-testnet-2",
  rpcUrl: "https://rpc.xion-testnet-2.burnt.com:443",
  restUrl: "https://api.xion-testnet-2.burnt.com",
  gasPrice: "0.001uxion",
  feeGranter: "xion1feegranter",
} as NormalizedAbstraxionConfig;

function signerAuth(checksum?: string): SignerAuthentication {
  return {
    type: "signer",
    aaApiUrl: "https://aa-api.xion-testnet-2.burnt.com",
    getSignerConfig: vi.fn(),
    smartAccountContract: {
      codeId: 1880,
      ...(checksum ? { checksum } : {}),
      addressPrefix: "xion",
    },
  };
}

describe("smart account wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes chain id and rpcUrl to the RPC strategy so it can read the chain's derivation hash", () => {
    createAccountStrategyFromConfig(config, signerAuth());

    expect(createCompositeAccountStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        rpc: {
          rpcUrl: config.rpcUrl,
          chainId: "xion-testnet-2",
          checksum: undefined,
          creator: "xion1feegranter",
          prefix: "xion",
          codeId: 1880,
        },
      }),
    );
  });

  it("forwards a configured checksum as a pin", () => {
    createAccountStrategyFromConfig(config, signerAuth("ABCD"));

    expect(
      vi.mocked(createCompositeAccountStrategy).mock.calls[0][0].rpc?.checksum,
    ).toBe("ABCD");
  });

  it("builds an account creation config without requiring a checksum", () => {
    expect(createAccountCreationConfigFromConfig(config, signerAuth())).toEqual(
      {
        aaApiUrl: "https://aa-api.xion-testnet-2.burnt.com",
        smartAccountContract: {
          codeId: 1880,
          checksum: undefined,
          addressPrefix: "xion",
        },
        feeGranter: "xion1feegranter",
      },
    );
  });
});
