import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConfig, getIframeUrl } from "@burnt-labs/constants";

describe("dashboard network routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses auth origins for every supported network", () => {
    expect(getIframeUrl("xion-mainnet-1")).toBe("https://auth.burnt.com");
    expect(getIframeUrl("xion-testnet-1")).toBe(
      "https://auth.testnet.burnt.com",
    );
    expect(getIframeUrl("xion-testnet-2")).toBe(
      "https://auth.testnet.burnt.com",
    );
  });

  it("resolves the dashboard URL from the chain id reported by the RPC", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: { node_info: { network: "xion-mainnet-1" } },
        }),
      }),
    );

    await expect(
      fetchConfig("https://rpc.xion-mainnet-1.burnt.com:443"),
    ).resolves.toMatchObject({
      dashboardUrl: "https://auth.burnt.com",
      networkId: "xion-mainnet-1",
    });
  });

  it("keeps supported networks on canonical auth origins", () => {
    // Released clients validate popup and iframe postMessage traffic against
    // the origin they were configured with. A cross-origin redirect from
    // settings.* to auth.* changes event.origin and those messages get
    // dropped. This test pins the SDK constants to their canonical origins.
    for (const url of Object.values({
      mainnet: getIframeUrl("xion-mainnet-1"),
      previousTestnet: getIframeUrl("xion-testnet-1"),
      testnet: getIframeUrl("xion-testnet-2"),
    })) {
      expect(url).toMatch(/^https:\/\/auth(\.testnet)?\.burnt\.com$/);
    }
  });
});
