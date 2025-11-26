/**
 * Vitest utilities
 * 
 * Vitest-specific test utilities and setup functions
 */

/**
 * Setup test environment for blockchain tests
 * Call this in vitest setup files or at the beginning of test suites
 */
export function setupTestEnvironment(): void {
  // Ensure TextEncoder/TextDecoder are available
  if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder as any;
  }

  // Set test timeout defaults
  if (typeof vi !== 'undefined') {
    vi.setConfig({ testTimeout: 30000 });
  }
}

/**
 * Create a spy on console methods to suppress output during tests
 */
export function suppressConsole(): {
  restore: () => void;
} {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  return {
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

/**
 * Capture console output during a test
 */
export function captureConsole(): {
  logs: string[];
  warns: string[];
  errors: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    logs.push(args.map(String).join(' '));
  };
  
  console.warn = (...args: any[]) => {
    warns.push(args.map(String).join(' '));
  };
  
  console.error = (...args: any[]) => {
    errors.push(args.map(String).join(' '));
  };

  return {
    logs,
    warns,
    errors,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

/**
 * Custom Vitest matcher to check if a value is a valid XION address
 */
export function toBeValidXionAddress(received: string): {
  pass: boolean;
  message: () => string;
} {
  const isValid = typeof received === 'string' && 
                  received.startsWith('xion') && 
                  received.length >= 39 && 
                  received.length <= 90;

  return {
    pass: isValid,
    message: () => 
      isValid
        ? `Expected ${received} not to be a valid XION address`
        : `Expected ${received} to be a valid XION address (must start with 'xion' and be 39-90 characters)`,
  };
}

/**
 * Custom Vitest matcher to check if a value is a valid grant expiration date
 */
export function toBeValidGrantExpiration(received: string): {
  pass: boolean;
  message: () => string;
} {
  try {
    const date = new Date(received);
    const now = new Date();
    const isValid = !isNaN(date.getTime()) && date > now;

    return {
      pass: isValid,
      message: () => 
        isValid
          ? `Expected ${received} not to be a valid future expiration date`
          : `Expected ${received} to be a valid future expiration date`,
    };
  } catch {
    return {
      pass: false,
      message: () => `Expected ${received} to be a valid ISO date string`,
    };
  }
}

/**
 * Extend Vitest matchers with custom matchers
 */
export function extendVitestMatchers(): void {
  if (typeof expect !== 'undefined' && expect.extend) {
    expect.extend({
      toBeValidXionAddress,
      toBeValidGrantExpiration,
    });
  }
}

// Type augmentation for custom matchers
declare global {
  namespace Vi {
    interface Matchers<R = any> {
      toBeValidXionAddress(): R;
      toBeValidGrantExpiration(): R;
    }
  }
}
