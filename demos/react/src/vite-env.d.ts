/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_REST_URL?: string;
  readonly VITE_GAS_PRICE?: string;
  readonly VITE_TREASURY_ADDRESS?: string;
  readonly VITE_AUTH_APP_URL?: string;
  readonly VITE_IFRAME_URL?: string;
  readonly VITE_DEMO_CONTRACT_ADDRESS?: string;

  // Signer mode (Turnkey)
  readonly VITE_TURNKEY_ORG_ID?: string;
  readonly VITE_TURNKEY_API_BASE_URL?: string;
  readonly VITE_AA_API_URL?: string;
  readonly VITE_CODE_ID?: string;
  readonly VITE_CHECKSUM?: string;
  readonly VITE_FEE_GRANTER_ADDRESS?: string;
  readonly VITE_ADDRESS_PREFIX?: string;
  readonly VITE_INDEXER_TYPE?: "subquery" | "numia";
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_INDEXER_TOKEN?: string;
  readonly VITE_TREASURY_INDEXER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
