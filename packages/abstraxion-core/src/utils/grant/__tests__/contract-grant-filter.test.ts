import { describe, it, expect, vi } from "vitest";
import {
  AcceptedMessageKeysFilter,
  AllowAllMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  MaxCallsLimit,
} from "cosmjs-types/cosmwasm/wasm/v1/authz";
import { fetchChainGrantsABCI } from "../query";
import { compareContractGrants } from "../compare";
import { decodeRestFormatAuthorization } from "../decoding";
import {
  AuthorizationTypes,
  ContractExecFilterTypes,
  ContractExecLimitTypes,
} from "../constants";
import type { ContractGrantDescription, HumanContractExecAuth } from "@/types";
import type * as Utils from "@/utils";

const { grantsMock } = vi.hoisted(() => ({ grantsMock: vi.fn() }));

vi.mock("cosmjs-types/cosmos/authz/v1beta1/query", () => ({
  QueryClientImpl: class {
    Grants = grantsMock;
  },
}));

vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof Utils>()),
  getRpcClient: vi.fn().mockResolvedValue({}),
}));

const granter = "xion1granter123456789";
const grantee = "xion1grantee123456789";
const vault = "xion1vaultcontract123456789";
const keys = ["admit_private", "cancel_pending_admission"];
const expirationSeconds = 1_900_000_000n;

const keysFilter = (filterKeys: string[]) => ({
  typeUrl: AcceptedMessageKeysFilter.typeUrl,
  value: AcceptedMessageKeysFilter.encode(
    AcceptedMessageKeysFilter.fromPartial({ keys: filterKeys }),
  ).finish(),
});
const allowAll = {
  typeUrl: AllowAllMessagesFilter.typeUrl,
  value: new Uint8Array(),
};
const maxCalls = (remaining: number) => ({
  typeUrl: MaxCallsLimit.typeUrl,
  value: MaxCallsLimit.encode(
    MaxCallsLimit.fromPartial({ remaining: BigInt(remaining) }),
  ).finish(),
});
const combined = (calls: number, amount: string) => ({
  typeUrl: CombinedLimit.typeUrl,
  value: CombinedLimit.encode(
    CombinedLimit.fromPartial({
      callsRemaining: BigInt(calls),
      amounts: [{ denom: "uxion", amount }],
    }),
  ).finish(),
});

type Entry = {
  contract: string;
  limit: { typeUrl: string; value: Uint8Array };
  filter: { typeUrl: string; value: Uint8Array };
};

/** Runs the chain's protobuf grant through fetchChainGrantsABCI, as pollForGrants does. */
const chainGrants = async (...entries: Entry[]) => {
  grantsMock.mockResolvedValueOnce({
    grants: [
      {
        authorization: {
          typeUrl: ContractExecutionAuthorization.typeUrl,
          value: ContractExecutionAuthorization.encode(
            ContractExecutionAuthorization.fromPartial({ grants: entries }),
          ).finish(),
        },
        expiration: { seconds: expirationSeconds, nanos: 0 },
      },
    ],
  });
  return (await fetchChainGrantsABCI(grantee, granter, "http://rpc")).grants;
};

const vaultRequest: ContractGrantDescription = {
  address: vault,
  amounts: [],
  acceptedMessageKeys: keys,
  maxCalls: 50,
};
const exactVaultEntry: Entry = {
  contract: vault,
  limit: maxCalls(50),
  filter: keysFilter(keys),
};

describe("fetchChainGrantsABCI contract grants", () => {
  it("returns REST grants with filter keys, limits and expiry, and keeps the raw value", async () => {
    const [grant] = await chainGrants(exactVaultEntry);

    expect(grant.expiration).toBe(
      new Date(Number(expirationSeconds) * 1000).toISOString(),
    );
    expect(grant.authorization).toMatchObject({
      "@type": AuthorizationTypes.ContractExecution,
      grants: [
        {
          contract: vault,
          limit: { "@type": ContractExecLimitTypes.MaxCalls, remaining: "50" },
          filter: { "@type": ContractExecFilterTypes.AcceptedKeys, keys },
        },
      ],
    });
    expect(
      (
        decodeRestFormatAuthorization(grant.authorization as never)
          .data as HumanContractExecAuth
      ).grants[0].keys,
    ).toEqual(keys);
  });

  it("lets a legacy string request compare against an ABCI contract grant", async () => {
    const grants = await chainGrants({
      contract: vault,
      limit: maxCalls(255),
      filter: allowAll,
    });

    expect(compareContractGrants(grants, [vault])).toBe(true);
  });
});

describe("compareContractGrants() with acceptedMessageKeys and maxCalls", () => {
  it("accepts exactly one entry with the same keys and a call budget within the request", async () => {
    expect(
      compareContractGrants(await chainGrants(exactVaultEntry), [vaultRequest]),
    ).toBe(true);
    expect(
      compareContractGrants(
        await chainGrants({
          ...exactVaultEntry,
          limit: maxCalls(3),
          filter: keysFilter([...keys].reverse()),
        }),
        [vaultRequest],
      ),
    ).toBe(true);
  });

  it.each([
    ["AllowAllMessagesFilter", allowAll],
    [
      "an unknown extra key",
      keysFilter([...keys, "update_attestation_policy"]),
    ],
    ["a missing key", keysFilter(["admit_private"])],
    ["a different key", keysFilter(["admit_private", "revoke"])],
  ])("rejects a chain grant with %s", async (_name, filter) => {
    const grants = await chainGrants({ ...exactVaultEntry, filter });

    expect(compareContractGrants(grants, [vaultRequest])).toBe(false);
  });

  it("rejects a second entry for the same contract", async () => {
    const grants = await chainGrants(exactVaultEntry, {
      contract: vault,
      limit: maxCalls(255),
      filter: allowAll,
    });

    expect(compareContractGrants(grants, [vaultRequest])).toBe(false);
  });

  it("rejects a grant for another contract only", async () => {
    const grants = await chainGrants({
      ...exactVaultEntry,
      contract: "xion1other",
    });

    expect(compareContractGrants(grants, [vaultRequest])).toBe(false);
  });

  it("rejects a call budget above the request", async () => {
    const grants = await chainGrants({
      ...exactVaultEntry,
      limit: maxCalls(51),
    });

    expect(compareContractGrants(grants, [vaultRequest])).toBe(false);
  });

  it("rejects a funds limit when the request carries no funds", async () => {
    const grants = await chainGrants({
      ...exactVaultEntry,
      limit: combined(50, "1"),
    });

    expect(compareContractGrants(grants, [vaultRequest])).toBe(false);
  });

  it("compares funds when the request carries amounts", async () => {
    const funded: ContractGrantDescription = {
      ...vaultRequest,
      amounts: [{ denom: "uxion", amount: "100" }],
    };

    expect(
      compareContractGrants(
        await chainGrants({ ...exactVaultEntry, limit: combined(50, "100") }),
        [funded],
      ),
    ).toBe(true);
    expect(
      compareContractGrants(
        await chainGrants({ ...exactVaultEntry, limit: combined(50, "101") }),
        [funded],
      ),
    ).toBe(false);
  });
});
