import { describe, it, expect, vi } from "vitest";
import {
  simulateWithRetry,
  SIMULATE_RETRY_COUNT,
  type SimulateContext,
} from "../index";

describe("simulateWithRetry", () => {
  const context: SimulateContext = {
    label: "treasury",
    granter: "xion1granter",
    grantee: "xion1grantee",
    treasury: "xion1treasury",
  };
  const msgs = [{ typeUrl: "/cosmos.authz.v1beta1.MsgGrant" }];

  it("returns success on first attempt when simulate resolves", async () => {
    const simulate = vi.fn().mockResolvedValue(123_456);
    const client = { simulate };

    const result = await simulateWithRetry(
      client,
      "xion1granter",
      msgs,
      "memo",
      context,
    );

    expect(result).toEqual({ kind: "success", simmedGas: 123_456 });
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it("rethrows on fatal errors without retrying", async () => {
    const simulate = vi
      .fn()
      .mockRejectedValue(new Error("invalid grant config"));
    const client = { simulate };

    await expect(
      simulateWithRetry(client, "xion1granter", msgs, "memo", context),
    ).rejects.toThrow(/invalid grant config/);
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it("falls back without retry on protocol-mismatch — broadcast will land", async () => {
    const empty = new Error(
      "rpc error: code = Unknown desc = signature is empty: execute wasm contract failed",
    );
    const simulate = vi.fn().mockRejectedValue(empty);
    const client = { simulate };

    const result = await simulateWithRetry(
      client,
      "xion1granter",
      msgs,
      "memo",
      context,
    );
    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") expect(result.lastError).toBe(empty);
    // Exactly one simulate attempt — no retry, since a retry would hit
    // the same wire-format incompatibility.
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it("falls back on non-blocking errors without retrying", async () => {
    const authzErr = new Error("codespace: authz, code: 2");
    const simulate = vi.fn().mockRejectedValue(authzErr);
    const client = { simulate };

    const result = await simulateWithRetry(
      client,
      "xion1granter",
      msgs,
      "memo",
      context,
    );

    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.lastError).toBe(authzErr);
    }
    expect(simulate).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors and succeeds on the retry", async () => {
    vi.useFakeTimers();
    try {
      const simulate = vi
        .fn()
        .mockRejectedValueOnce(new Error("account sequence mismatch"))
        .mockResolvedValueOnce(999);
      const client = { simulate };

      const promise = simulateWithRetry(
        client,
        "xion1granter",
        msgs,
        "memo",
        context,
      );
      // Fire the retry backoff timer (and flush the follow-up retry).
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ kind: "success", simmedGas: 999 });
      expect(simulate).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back when all transient retries exhaust", async () => {
    vi.useFakeTimers();
    try {
      const simulate = vi
        .fn()
        .mockRejectedValue(new Error("account sequence mismatch"));
      const client = { simulate };

      const promise = simulateWithRetry(
        client,
        "xion1granter",
        msgs,
        "memo",
        context,
      );
      // Fire all retry backoff timers until the attempts exhaust.
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.kind).toBe("fallback");
      // Initial attempt + SIMULATE_RETRY_COUNT retries
      expect(simulate).toHaveBeenCalledTimes(SIMULATE_RETRY_COUNT + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs structured warnings on every failed attempt", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const simulate = vi
        .fn()
        .mockRejectedValue(new Error("codespace: authz, code: 2"));
      const client = { simulate };

      await simulateWithRetry(
        client,
        "xion1someoneelse", // mismatched sender → granterMatchesSender=false
        msgs,
        "memo",
        { ...context, chainId: "xion-mainnet-1" },
      );

      expect(warn).toHaveBeenCalledOnce();
      const [logLabel, logPayload] = warn.mock.calls[0];
      expect(logLabel).toBe("[Grant/treasury] simulate failed");
      expect(logPayload).toMatchObject({
        classification: "non-blocking",
        diagnosis: null,
        chainId: "xion-mainnet-1",
        granter: "xion1granter",
        grantee: "xion1grantee",
        treasury: "xion1treasury",
        granterMatchesSender: false,
        msgTypes: ["/cosmos.authz.v1beta1.MsgGrant"],
      });
    } finally {
      warn.mockRestore();
    }
  });

  it("attaches the diagnosis hint to the log on protocol-mismatch errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const simulate = vi
        .fn()
        .mockRejectedValue(
          new Error("signature is empty: execute wasm contract failed"),
        );
      const client = { simulate };

      const result = await simulateWithRetry(
        client,
        "xion1granter",
        msgs,
        "memo",
        { ...context, chainId: "xion-mainnet-1" },
      );
      expect(result.kind).toBe("fallback");

      const [, logPayload] = warn.mock.calls[0];
      expect(logPayload).toMatchObject({
        classification: "non-blocking",
        chainId: "xion-mainnet-1",
      });
      expect((logPayload as { diagnosis: string }).diagnosis).toMatch(
        /alpha\.9|FEFA4D0C/,
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("routes telemetry through an injected logger instead of console.warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const logger = vi.fn();
      const simulate = vi
        .fn()
        .mockRejectedValue(new Error("codespace: authz, code: 2"));
      const client = { simulate };

      await simulateWithRetry(client, "xion1granter", msgs, "memo", {
        ...context,
        logger,
      });

      expect(logger).toHaveBeenCalledOnce();
      const [logLabel, logPayload] = logger.mock.calls[0];
      expect(logLabel).toBe("[Grant/treasury] simulate failed");
      expect(logPayload).toMatchObject({ classification: "non-blocking" });
      // Injected logger replaces console.warn entirely.
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("accepts an arbitrary string label (not just a grant-flow union)", async () => {
    const logger = vi.fn();
    const simulate = vi
      .fn()
      .mockRejectedValue(new Error("codespace: authz, code: 2"));
    const client = { simulate };

    await simulateWithRetry(client, "xion1granter", msgs, "memo", {
      ...context,
      label: "sign",
      logger,
    });

    expect(logger.mock.calls[0][0]).toBe("[Grant/sign] simulate failed");
  });

  it("logs the String(error) form when simulate rejects with a non-Error", async () => {
    const logger = vi.fn();
    // Reject with a plain string (not an Error) — exercises the
    // `error instanceof Error ? error.message : String(error)` non-Error
    // branch in the log payload. Still classified from its string form.
    const simulate = vi.fn().mockRejectedValue("codespace: authz, code: 2");
    const client = { simulate };

    const result = await simulateWithRetry(client, "xion1granter", msgs, "memo", {
      ...context,
      logger,
    });

    expect(result.kind).toBe("fallback");
    const [, logPayload] = logger.mock.calls[0];
    expect(logPayload).toMatchObject({
      classification: "non-blocking",
      message: "codespace: authz, code: 2",
    });
  });
});
