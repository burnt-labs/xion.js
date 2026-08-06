const ACCOUNT_INDEX_BASE = 1_000_000_000;
const ACCOUNT_INDEX_RANGE = 1_000_000_000;
const MAX_INVOCATIONS_PER_TEST_FILE = 1_000;

export interface AccountIndexCoordinates {
  runId: string;
  attempt: number;
  shard: number;
  worker: number;
  namespace: string;
  invocation: number;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function numericSlot(value: string | undefined): number {
  if (!value) return 0;

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? Math.abs(parsed) : stableHash(value);
}

export function deterministicAccountIndex({
  runId,
  attempt,
  shard,
  worker,
  namespace,
  invocation,
}: AccountIndexCoordinates): number {
  if (invocation < 0 || invocation >= MAX_INVOCATIONS_PER_TEST_FILE) {
    throw new RangeError(
      `Integration test file exceeded ${MAX_INVOCATIONS_PER_TEST_FILE} account allocations`,
    );
  }

  const coordinates = [
    runId,
    attempt,
    shard,
    worker,
    namespace,
    invocation,
  ].join(":");

  return ACCOUNT_INDEX_BASE + (stableHash(coordinates) % ACCOUNT_INDEX_RANGE);
}

export function createAccountIndexAllocator(
  environment: NodeJS.ProcessEnv = process.env,
): (namespace?: string) => number {
  const runId =
    environment.GITHUB_RUN_ID ?? environment.XION_TEST_RUN_ID ?? "local";
  const attempt = numericSlot(environment.GITHUB_RUN_ATTEMPT);
  const shard = numericSlot(environment.TEST_SHARD_INDEX);
  const worker = numericSlot(
    environment.VITEST_POOL_ID ?? environment.VITEST_WORKER_ID,
  );
  let invocation = 0;

  return (namespace = "integration") =>
    deterministicAccountIndex({
      runId,
      attempt,
      shard,
      worker,
      namespace,
      invocation: invocation++,
    });
}

export function createStableAccountIndexResolver(
  environment: NodeJS.ProcessEnv = process.env,
): (namespace?: string) => number {
  const runId =
    environment.GITHUB_RUN_ID ?? environment.XION_TEST_RUN_ID ?? "local";
  const attempt = numericSlot(environment.GITHUB_RUN_ATTEMPT);
  const shard = numericSlot(environment.TEST_SHARD_INDEX);
  const worker = numericSlot(
    environment.VITEST_POOL_ID ?? environment.VITEST_WORKER_ID,
  );

  return (namespace = "integration") =>
    deterministicAccountIndex({
      runId,
      attempt,
      shard,
      worker,
      namespace,
      invocation: 0,
    });
}
