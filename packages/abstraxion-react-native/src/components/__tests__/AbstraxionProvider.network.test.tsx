import React, { useContext } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "xion-demo://"),
  getInitialURL: vi.fn(),
  parse: vi.fn(() => ({ queryParams: {} })),
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));

import {
  AbstraxionContext,
  AbstraxionProvider,
  type AbstraxionConfig,
} from "../AbstraxionContext";

// The provider's JSX is compiled with the classic runtime in tests.
(globalThis as { React?: typeof React }).React = React;

function renderChain(config: AbstraxionConfig) {
  const seen: { chainId?: string; rpcUrl?: string; authMode?: string } = {};
  function Probe() {
    const ctx = useContext(AbstraxionContext);
    seen.chainId = ctx.chainId;
    seen.rpcUrl = ctx.rpcUrl;
    seen.authMode = ctx.authMode;
    return null;
  }
  render(
    <AbstraxionProvider config={config}>
      <Probe />
    </AbstraxionProvider>,
  );
  return seen;
}

describe("AbstraxionProvider network", () => {
  it("runs signer mode with only the network configured", () => {
    const seen = renderChain({
      network: "mainnet",
      authentication: { type: "signer", getSignerConfig: vi.fn() },
    });

    expect(seen).toEqual({
      chainId: "xion-mainnet-1",
      rpcUrl: "https://rpc.xion-mainnet-1.burnt.com:443",
      authMode: "signer",
    });
  });

  it("keeps the testnet default when neither network nor chainId is set", () => {
    const seen = renderChain({});

    expect(seen.chainId).toBe("xion-testnet-2");
  });
});
