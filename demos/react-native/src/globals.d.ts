// Ambient declarations for the RN/Expo runtime globals used in this demo.
// `process.env.EXPO_PUBLIC_*` is read at compile time by the Metro/Expo
// transformer; `global.quickCrypto` is set by the crypto setup file.
declare const process: {
  env: Record<string, string | undefined>;
};

declare const global: typeof globalThis & {
  quickCrypto?: unknown;
  Buffer?: unknown;
};
