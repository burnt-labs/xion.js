/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_REST_URL?: string;
  readonly VITE_GAS_PRICE?: string;
  readonly VITE_TREASURY_ADDRESS?: string;
  readonly VITE_AUTH_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
