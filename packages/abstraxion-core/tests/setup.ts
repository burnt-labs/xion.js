import { TextDecoder, TextEncoder } from "text-encoding";

// Set up global TextEncoder and TextDecoder for Jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
