// Frontend type definitions extracted from components and pages

// Wallet Status Types
export interface WalletStatus {
  connected: boolean;
  sessionKeyAddress?: string;
  metaAccountAddress?: string;
  permissions?: {
    contracts?: Array<
      | string
      | { address: string; amounts: Array<{ denom: string; amount: string }> }
    >;
    bank?: { denom: string; amount: string }[];
    stake?: boolean;
    treasury?: string;
    expiry?: number;
  };
  expiresAt?: number;
  state?: string;
}

// Wallet Balance Types
export interface WalletBalance {
  amount: string;
  denom: string;
  microAmount: string;
}

// Wallet Data Types
export interface WalletData {
  metaAccountAddress: string;
  balances?: {
    xion: WalletBalance;
    usdc: WalletBalance;
  };
}

// Component Props Types
export interface WalletComponentProps {
  account: WalletStatus;
  onRefresh?: () => void;
}

export interface TransferComponentProps {
  onTransferComplete?: (transactionHash: string) => void;
}

// Token Denomination Types
export type TokenDenom = "XION" | "USDC";
