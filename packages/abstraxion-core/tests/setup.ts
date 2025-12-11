import { TextDecoder, TextEncoder } from "text-encoding";

// Set up global TextEncoder and TextDecoder for Vitest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add any global test setup here
