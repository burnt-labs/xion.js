import type { WalletDefinition } from "./types";

/**
 * Detect which wallets are available in the browser
 * @param definitions - Wallet definitions to check
 * @returns Array of available wallets
 */
export async function detectAvailableWallets(
  definitions: WalletDefinition[],
): Promise<WalletDefinition[]> {
  const available: WalletDefinition[] = [];

  for (const wallet of definitions) {
    try {
      if (wallet.detect) {
        // Use custom detection logic if provided
        if (await wallet.detect()) {
          available.push(wallet);
        }
      } else {
        // Default detection: check window object
        if (isWalletAvailable(wallet.windowKey)) {
          available.push(wallet);
        }
      }
    } catch (error) {
      console.warn(`[Abstraxion] Failed to detect wallet ${wallet.id}:`, error);
    }
  }

  return available;
}

/**
 * Check if a wallet is available via window object
 * Supports nested keys like 'okxwallet.keplr'
 */
function isWalletAvailable(windowKey: string): boolean {
  const keys = windowKey.split(".");
  let obj: any = window;

  for (const key of keys) {
    obj = obj?.[key];
    if (!obj) {
      return false;
    }
  }

  return true;
}

/**
 * Get wallet object from window
 * @param windowKey - Window object key (supports nested like 'okxwallet.keplr')
 */
export function getWalletFromWindow(windowKey: string): any {
  const keys = windowKey.split(".");
  let obj: any = window;

  for (const key of keys) {
    obj = obj?.[key];
    if (!obj) {
      return null;
    }
  }

  return obj;
}

/**
 * Auto-connect to the first available wallet
 * @param wallets - Wallet definitions to try
 * @param connectFn - Function to connect to a wallet by ID
 * @returns true if connected, false if no wallets available
 */
export async function autoConnectWallet(
  wallets: WalletDefinition[],
  connectFn: (walletId: string) => Promise<void>,
): Promise<boolean> {
  const available = await detectAvailableWallets(wallets);

  if (available.length === 0) {
    console.log("[Abstraxion] No wallets available for auto-connect");
    return false;
  }

  console.log(
    `[Abstraxion] Auto-connecting to ${available[0].name} (${available[0].id})`,
  );

  try {
    await connectFn(available[0].id);
    return true;
  } catch (error) {
    console.error(
      `[Abstraxion] Auto-connect failed for ${available[0].name}:`,
      error,
    );
    return false;
  }
}
