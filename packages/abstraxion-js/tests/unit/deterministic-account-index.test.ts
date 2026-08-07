import { describe, expect, it } from "vitest";
import {
  createAccountIndexAllocator,
  createStableAccountIndexResolver,
  deterministicAccountIndex,
} from "../support/deterministic-account-index";

describe("deterministic integration account indexes", () => {
  it("returns the same index for the same execution coordinates", () => {
    const coordinates = {
      runId: "30664888873",
      attempt: 1,
      shard: 2,
      worker: 3,
      namespace: "fee granting > explicit fee",
      invocation: 4,
    };

    expect(deterministicAccountIndex(coordinates)).toBe(
      deterministicAccountIndex(coordinates),
    );
  });

  it("isolates attempts, shards, workers, and invocations", () => {
    const baseline = {
      runId: "30664888873",
      attempt: 0,
      shard: 0,
      worker: 0,
      namespace: "baseline",
      invocation: 0,
    };
    const indexes = [
      deterministicAccountIndex(baseline),
      deterministicAccountIndex({ ...baseline, attempt: 1 }),
      deterministicAccountIndex({ ...baseline, shard: 1 }),
      deterministicAccountIndex({ ...baseline, worker: 1 }),
      deterministicAccountIndex({ ...baseline, namespace: "another test" }),
      deterministicAccountIndex({ ...baseline, invocation: 1 }),
    ];

    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("allocates a reproducible sequence from CI metadata", () => {
    const environment = {
      GITHUB_RUN_ID: "30664888873",
      GITHUB_RUN_ATTEMPT: "2",
      TEST_SHARD_INDEX: "3",
      VITEST_POOL_ID: "4",
    };
    const firstAllocator = createAccountIndexAllocator(environment);
    const secondAllocator = createAccountIndexAllocator(environment);

    expect([firstAllocator("test one"), firstAllocator("test two")]).toEqual([
      secondAllocator("test one"),
      secondAllocator("test two"),
    ]);
  });

  it("reuses one account within a test while isolating test namespaces", () => {
    const resolve = createStableAccountIndexResolver({
      GITHUB_RUN_ID: "30664888873",
      VITEST_POOL_ID: "2",
    });

    expect(resolve("test one")).toBe(resolve("test one"));
    expect(resolve("test one")).not.toBe(resolve("test two"));
  });

  it("fails when a worker exhausts its reserved account range", () => {
    const allocator = createAccountIndexAllocator({ GITHUB_RUN_ID: "1" });

    for (let invocation = 0; invocation < 1_000; invocation++) allocator();

    expect(() => allocator()).toThrow(RangeError);
  });
});
