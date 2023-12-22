interface Coin {
  readonly denom: string;
  readonly amount: string;
}

interface BalanceInfo {
  // In USDC
  total: number;
  balances: Coin[];
}

interface Authenticators {
  nodes: { type: string; id: string }[];
}
