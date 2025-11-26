/**
 * Test helper functions
 * 
 * Provides utilities for setting up tests, timeouts, and waiting for conditions
 */

/**
 * Standard test configuration for XION testnet
 */
export interface TestConfig {
  rpcUrl: string;
  restUrl: string;
  chainId: string;
  addressPrefix: string;
  feeToken: string;
}

/**
 * Get test configuration for XION testnet
 */
export function getTestConfig(): TestConfig {
  return {
    rpcUrl: process.env.TEST_RPC_URL || "https://rpc.xion-testnet-1.burnt.com:443",
    restUrl: process.env.TEST_REST_URL || "https://api.xion-testnet-1.burnt.com",
    chainId: process.env.TEST_CHAIN_ID || "xion-testnet-1",
    addressPrefix: "xion",
    feeToken: "uxion",
  };
}

/**
 * Create a timeout in milliseconds for integration tests
 * Default is 30 seconds for blockchain operations
 */
export function createTestTimeout(seconds: number = 30): number {
  return seconds * 1000;
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const {
    timeout = 30000,
    interval = 1000,
    timeoutMessage = "Condition not met within timeout",
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(condition());
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(timeoutMessage);
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError || new Error("Retry failed with unknown error");
}

/**
 * Create a mock timer for testing time-dependent code
 * Compatible with TimeProvider interface used in CacheManager
 */
export class MockTimer {
  private currentTime: number;

  constructor(initialTime: number = Date.now()) {
    this.currentTime = initialTime;
  }

  /**
   * Get the current mock time (implements TimeProvider.now())
   */
  now(): number {
    return this.currentTime;
  }

  /**
   * Advance time by specified milliseconds
   */
  advance(ms: number): void {
    this.currentTime += ms;
  }

  /**
   * Set the current time to a specific value
   */
  setTime(time: number | Date): void {
    this.currentTime = typeof time === 'number' ? time : time.getTime();
  }

  /**
   * Reset to current system time
   */
  reset(): void {
    this.currentTime = Date.now();
  }
}

/**
 * Generate a random hex string of specified length
 */
export function randomHex(length: number = 32): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;
}

/**
 * Skip test if not in integration test mode
 */
export function skipIfNotIntegration(): void {
  if (!process.env.RUN_INTEGRATION_TESTS) {
    throw new Error('Skipping: Integration tests not enabled. Set RUN_INTEGRATION_TESTS=true');
  }
}
