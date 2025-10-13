/**
 * Global type declarations for browser wallet extensions
 */

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
  selectedAddress?: string;
  chainId?: string;
  isMetaMask?: boolean;
}

interface KeplrKey {
  name: string;
  algo: string;
  pubKey: Uint8Array;
  address: Uint8Array;
  bech32Address: string;
  isNanoLedger?: boolean;
  isKeystone?: boolean;
}

interface KeplrIntereactionOptions {
  readonly sign?: {
    readonly preferNoSetFee?: boolean;
    readonly preferNoSetMemo?: boolean;
    readonly disableBalanceCheck?: boolean;
  };
}

interface Keplr {
  readonly version: string;
  enable(chainIds: string | string[]): Promise<void>;
  getKey(chainId: string): Promise<KeplrKey>;
  signArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
  ): Promise<{ pubKey: Uint8Array; signature: Uint8Array }>;
  experimentalSuggestChain(chainInfo: unknown): Promise<void>;
  getOfflineSigner(
    chainId: string,
    options?: KeplrIntereactionOptions,
  ): unknown;
  getOfflineSignerOnlyAmino(
    chainId: string,
    options?: KeplrIntereactionOptions,
  ): unknown;
  getOfflineSignerAuto(
    chainId: string,
    options?: KeplrIntereactionOptions,
  ): Promise<unknown>;
  signDirect(
    chainId: string,
    signer: string,
    signDoc: {
      bodyBytes?: Uint8Array | null;
      authInfoBytes?: Uint8Array | null;
      chainId?: string | null;
      accountNumber?: string | null;
    },
  ): Promise<unknown>;
}

interface OKXWallet {
  keplr?: Keplr;
}

interface Window {
  ethereum?: EthereumProvider;
  keplr?: Keplr;
  leap?: Keplr;
  okxwallet?: OKXWallet;
}