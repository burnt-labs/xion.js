import { describe, it, expect } from "vitest";
import {
  classifyGrantError,
  classifySimulateError,
  diagnoseSimulateError,
} from "../classify";

describe("classifySimulateError", () => {
  it("classifies authz code 2 as non-blocking", () => {
    expect(
      classifySimulateError(
        new Error(
          "Broadcasting transaction failed with code 2 (codespace: authz): authorization not found",
        ),
      ),
    ).toBe("non-blocking");
  });

  it("classifies generic Querier contract errors as non-blocking", () => {
    expect(
      classifySimulateError(
        new Error("Querier contract error: smart account not initialised"),
      ),
    ).toBe("non-blocking");
  });

  it("classifies account sequence mismatch as transient", () => {
    expect(
      classifySimulateError(
        new Error("account sequence mismatch, expected 5, got 4"),
      ),
    ).toBe("transient");
  });

  it("classifies socket timeout as transient", () => {
    expect(classifySimulateError(new Error("request timed out"))).toBe(
      "transient",
    );
    expect(classifySimulateError(new Error("ECONNRESET"))).toBe("transient");
  });

  it("classifies unknown messages as fatal", () => {
    expect(
      classifySimulateError(new Error("invalid grant config: missing field")),
    ).toBe("fatal");
    expect(classifySimulateError("something string-y")).toBe("fatal");
    expect(classifySimulateError(undefined)).toBe("fatal");
  });

  // Simulate-time wire-format / contract-version mismatch is `non-blocking`
  // — the signed broadcast that follows carries a real credential so
  // contract-side guards are satisfied; only the simulate placeholder trips
  // the older AA contract version.
  it("classifies 'signature is empty' as non-blocking — the signed broadcast lands fine", () => {
    const err = new Error(
      "Query failed with (6): rpc error: code = Unknown desc = signature is empty: execute wasm contract failed with gas used: '44192': unknown request",
    );
    expect(classifySimulateError(err)).toBe("non-blocking");
    expect(diagnoseSimulateError(err)).toMatch(/alpha\.9/);
  });

  it("classifies 'EmptySignature' contract error as non-blocking with a diagnosis hint", () => {
    const err = new Error(
      "dispatch: EmptySignature: execute wasm contract failed",
    );
    expect(classifySimulateError(err)).toBe("non-blocking");
    expect(diagnoseSimulateError(err)).toMatch(
      /wire-format mismatch|postmortem/i,
    );
  });

  it("returns null diagnosis for non-protocol-mismatch errors", () => {
    expect(
      diagnoseSimulateError(new Error("account sequence mismatch")),
    ).toBeNull();
    expect(
      diagnoseSimulateError(new Error("codespace: authz, code: 2")),
    ).toBeNull();
    expect(diagnoseSimulateError(new Error("anything else"))).toBeNull();
  });
});

describe("classifyGrantError", () => {
  it("classifies missing-authenticator errors as account", () => {
    expect(
      classifyGrantError(
        new Error("Authenticator at index 0 not found for account xion1…"),
      ),
    ).toBe("account");
  });

  it("classifies invalid contract grant errors as config", () => {
    expect(
      classifyGrantError(new Error("InvalidContractGrant: bad limit shape")),
    ).toBe("config");
  });

  it("classifies unsafe redirect URL as config", () => {
    expect(classifyGrantError(new Error("Unsafe redirect URL detected"))).toBe(
      "config",
    );
  });

  it("classifies sequence mismatch as transient", () => {
    expect(
      classifyGrantError(
        new Error("account sequence mismatch, expected 5, got 4"),
      ),
    ).toBe("transient");
  });

  it("classifies timeouts as transient", () => {
    expect(classifyGrantError(new Error("request timed out"))).toBe(
      "transient",
    );
  });

  it("falls back to unknown for unrecognised errors", () => {
    expect(classifyGrantError(new Error("kaboom"))).toBe("unknown");
  });

  it("accepts non-Error throwables via String()", () => {
    expect(classifyGrantError("Authenticator not found")).toBe("account");
    expect(classifyGrantError({ foo: "bar" })).toBe("unknown");
  });
});

// ── Pattern-affirmation tables ──────────────────────────────────────
// One representative message per regex alternation, so a future edit that
// breaks a single pattern is caught individually. (Branch *outcomes* are
// covered by the cases above; these guard each alternation as a regression
// fence and document what real chain errors each pattern is meant to catch.)

describe("classifySimulateError — transient alternations", () => {
  it.each([
    ["account sequence mismatch, expected 5, got 4"],
    ["incorrect account sequence"],
    ["request timed out"],
    ["connection timeout"],
    ["ECONNRESET"],
    ["ENETUNREACH"],
    ["ETIMEDOUT"],
    ["rpc error: service temporarily unavailable"],
  ])("classifies %j as transient", (msg) => {
    expect(classifySimulateError(new Error(msg))).toBe("transient");
  });
});

describe("classifySimulateError — non-blocking alternations", () => {
  it.each([
    // authz code 2, codespace-first ordering
    ["failed to execute; codespace: authz, code: 2: authorization not found"],
    // authz code 2, code-first ordering
    ["broadcast failed with code: 2 — codespace: authz"],
    ["Querier contract error: account not initialised"],
    // protocol-mismatch signals (also non-blocking)
    ["rpc error: signature is empty: execute wasm contract failed"],
    ["dispatch: EmptySignature: execute wasm contract failed"],
  ])("classifies %j as non-blocking", (msg) => {
    expect(classifySimulateError(new Error(msg))).toBe("non-blocking");
  });

  it("does not match code 20 as authz code 2 (word-boundary guard)", () => {
    expect(
      classifySimulateError(
        new Error("codespace: authz, code: 20: out of gas"),
      ),
    ).toBe("fatal");
  });
});

describe("diagnoseSimulateError — non-Error inputs", () => {
  it("extracts the message from a non-Error throwable that still matches", () => {
    // Exercises the String(error) branch on a non-Error value.
    expect(diagnoseSimulateError("signature is empty")).toMatch(/alpha\.9/);
  });

  it("returns null for a non-Error with no protocol match", () => {
    expect(diagnoseSimulateError({ some: "object" })).toBeNull();
  });
});

describe("classifyGrantError — account alternations", () => {
  it.each([
    ["Authenticator at index 0 not found for account xion1…"],
    ["authenticator NOT FOUND"],
  ])("classifies %j as account", (msg) => {
    expect(classifyGrantError(new Error(msg))).toBe("account");
  });
});

describe("classifyGrantError — config alternations", () => {
  it.each([
    ["invalid contract grant: bad shape"],
    ["invalid contract grants for treasury"],
    ["InvalidContractGrant: limit"],
    ["FeeGrantValidationError: insufficient allowance"],
    ["contract not found"],
    ["contract: not found"],
    ["no such contract: xion1…"],
    ["Unsafe redirect URL detected"],
  ])("classifies %j as config", (msg) => {
    expect(classifyGrantError(new Error(msg))).toBe("config");
  });
});

describe("classifyGrantError — transient alternations (via simulate classifier)", () => {
  it.each([
    ["account sequence mismatch"],
    ["incorrect account sequence"],
    ["request timed out"],
    ["ECONNRESET"],
  ])("classifies %j as transient", (msg) => {
    expect(classifyGrantError(new Error(msg))).toBe("transient");
  });
});
