import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import {
  decodeAuthorization,
  decodeRestFormatAuthorization,
} from "../decoding";
import { AuthorizationTypes } from "../constants";

describe("decodeAuthorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Unsupported and warns for unknown typeUrl", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unknownType = "/some.unknown.Authorization";
    const result = decodeAuthorization(unknownType, new Uint8Array());

    expect(result.type).toBe(AuthorizationTypes.Unsupported);
    expect(result.data).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      `[decodeAuthorization] Unknown authorization typeUrl: ${unknownType}. Returning Unsupported.`,
    );
  });

  it("decodes Generic authorization correctly", () => {
    const msg = "/cosmos.bank.v1beta1.MsgSend";
    const encoded = GenericAuthorization.encode(
      GenericAuthorization.fromPartial({ msg }),
    ).finish();

    const result = decodeAuthorization(AuthorizationTypes.Generic, encoded);

    expect(result.type).toBe(AuthorizationTypes.Generic);
    expect((result.data as GenericAuthorization).msg).toBe(msg);
  });

  it("decodes Send authorization correctly", () => {
    const spendLimit = [{ denom: "uxion", amount: "1000000" }];
    const encoded = SendAuthorization.encode(
      SendAuthorization.fromPartial({ spendLimit }),
    ).finish();

    const result = decodeAuthorization(AuthorizationTypes.Send, encoded);

    expect(result.type).toBe(AuthorizationTypes.Send);
    const data = result.data as SendAuthorization;
    expect(data.spendLimit).toHaveLength(1);
    expect(data.spendLimit[0].denom).toBe("uxion");
    expect(data.spendLimit[0].amount).toBe("1000000");
  });

  it("decodes Stake authorization correctly", () => {
    const encoded = StakeAuthorization.encode(
      StakeAuthorization.fromPartial({
        authorizationType: 1,
        maxTokens: { denom: "uxion", amount: "500000" },
      }),
    ).finish();

    const result = decodeAuthorization(AuthorizationTypes.Stake, encoded);

    expect(result.type).toBe(AuthorizationTypes.Stake);
    const data = result.data as StakeAuthorization;
    expect(data.authorizationType).toBe(1);
    expect(data.maxTokens?.denom).toBe("uxion");
  });
});

describe("decodeRestFormatAuthorization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns Unsupported and warns for unknown type", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unknownType = "/some.unknown.Type";
    const result = decodeRestFormatAuthorization({
      "@type": unknownType,
    });

    expect(result.type).toBe(AuthorizationTypes.Unsupported);
    expect(result.data).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      `[decodeRestFormatAuthorization] Unknown authorization type: ${unknownType}. Returning Unsupported.`,
    );
  });

  it("returns Unsupported and warns when ContractExecution value is not Uint8Array", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = decodeRestFormatAuthorization({
      "@type": AuthorizationTypes.ContractExecution,
      value: "not-a-uint8array",
    });

    expect(result.type).toBe(AuthorizationTypes.Unsupported);
    expect(result.data).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      `[decodeRestFormatAuthorization] ContractExecution value is not Uint8Array. Returning Unsupported.`,
    );
  });

  it("does not throw when Send authorization has null spend_limit", () => {
    const result = decodeRestFormatAuthorization({
      "@type": AuthorizationTypes.Send,
      spend_limit: null,
    });

    expect(result.type).toBe(AuthorizationTypes.Send);
    const data = result.data as SendAuthorization;
    expect(data.spendLimit).toEqual([]);
  });

  it("does not throw when Send authorization has undefined spend_limit", () => {
    const result = decodeRestFormatAuthorization({
      "@type": AuthorizationTypes.Send,
    });

    expect(result.type).toBe(AuthorizationTypes.Send);
    const data = result.data as SendAuthorization;
    expect(data.spendLimit).toEqual([]);
  });

  it("decodes Generic REST format correctly", () => {
    const result = decodeRestFormatAuthorization({
      "@type": AuthorizationTypes.Generic,
      msg: "/cosmos.bank.v1beta1.MsgSend",
    });

    expect(result.type).toBe(AuthorizationTypes.Generic);
    expect((result.data as GenericAuthorization).msg).toBe(
      "/cosmos.bank.v1beta1.MsgSend",
    );
  });

  it("decodes Send REST format correctly", () => {
    const result = decodeRestFormatAuthorization({
      "@type": AuthorizationTypes.Send,
      spend_limit: [{ denom: "uxion", amount: "1000000" }],
      allow_list: ["xion1abc"],
    });

    expect(result.type).toBe(AuthorizationTypes.Send);
    const data = result.data as SendAuthorization;
    expect(data.spendLimit).toEqual([{ denom: "uxion", amount: "1000000" }]);
    expect(data.allowList).toEqual(["xion1abc"]);
  });

  it("decodes Stake REST format correctly", () => {
    const result = decodeRestFormatAuthorization({
      "@type": AuthorizationTypes.Stake,
      authorization_type: "AUTHORIZATION_TYPE_DELEGATE",
      max_tokens: { denom: "uxion", amount: "500000" },
      allow_list: ["xion1validator"],
    });

    expect(result.type).toBe(AuthorizationTypes.Stake);
    const data = result.data as StakeAuthorization;
    expect(data.authorizationType).toBe(1);
    expect(data.maxTokens?.denom).toBe("uxion");
  });
});
