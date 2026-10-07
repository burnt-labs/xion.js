/**
 * Unit tests for indexer config conversion
 */

import { describe, it, expect } from "vitest";
import {
  convertIndexerConfig,
  extractIndexerAuthToken,
} from "../indexerConfigUtils";

describe("convertIndexerConfig", () => {
  it("returns undefined without a config", () => {
    expect(convertIndexerConfig(undefined)).toBeUndefined();
  });

  it("passes a DaoDao config through with its chain", () => {
    expect(
      convertIndexerConfig({
        type: "daodao",
        url: "https://daodaoindexer.burnt.com",
        chainId: "xion-mainnet-1",
      }),
    ).toEqual({
      type: "daodao",
      url: "https://daodaoindexer.burnt.com",
      chainId: "xion-mainnet-1",
    });
  });

  it("takes the Subquery code ID from the smart account contract", () => {
    expect(
      convertIndexerConfig(
        { type: "subquery", url: "https://sq.example.com" },
        { codeId: 5 } as never,
      ),
    ).toEqual({ type: "subquery", url: "https://sq.example.com", codeId: 5 });
  });

  it("treats an untyped config as Numia", () => {
    expect(
      convertIndexerConfig({
        url: "https://numia.example.com",
        authToken: "t",
      }),
    ).toEqual({
      type: "numia",
      url: "https://numia.example.com",
      authToken: "t",
    });
  });
});

describe("extractIndexerAuthToken", () => {
  it("has no token for DaoDao", () => {
    expect(
      extractIndexerAuthToken({
        type: "daodao",
        url: "https://daodaoindexer.burnt.com",
        chainId: "xion-mainnet-1",
      }),
    ).toBeUndefined();
  });

  it("returns a Numia token", () => {
    expect(
      extractIndexerAuthToken({
        type: "numia",
        url: "https://numia.example.com",
        authToken: "t",
      }),
    ).toBe("t");
  });
});
