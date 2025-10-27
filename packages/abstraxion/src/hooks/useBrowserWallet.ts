import { useContext } from "react";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";

/**
 * Browser wallet state for browser authentication mode
 * This hook provides state and actions for wallet selection UI
 * Only relevant when using authentication.type = "browser"
 */
export interface BrowserWalletState {
  /** Whether to show the wallet selection modal */
  showWalletSelectionModal: boolean;

  /** Set whether to show the wallet selection modal */
  setShowWalletSelectionModal: React.Dispatch<React.SetStateAction<boolean>>;

  /** Current wallet selection error, if any */
  walletSelectionError: string | null;

  /** Set wallet selection error */
  setWalletSelectionError: React.Dispatch<React.SetStateAction<string | null>>;

  /** Connect to a specific wallet by ID */
  handleWalletConnect: (walletId: string) => Promise<void>;

  /** Whether a wallet connection is in progress */
  isConnecting: boolean;
}

/**
 * Hook for browser wallet authentication state
 * Use this when building custom wallet selection UI for browser mode
 *
 * @example
 * ```tsx
 * function MyWalletModal() {
 *   const {
 *     showWalletSelectionModal,
 *     setShowWalletSelectionModal,
 *     walletSelectionError,
 *     handleWalletConnect,
 *     isConnecting,
 *   } = useBrowserWallet();
 *
 *   if (!showWalletSelectionModal) return null;
 *
 *   return (
 *     <Dialog>
 *       <button onClick={() => handleWalletConnect('metamask')}>
 *         MetaMask
 *       </button>
 *       {walletSelectionError && <Error>{walletSelectionError}</Error>}
 *     </Dialog>
 *   );
 * }
 * ```
 */
export const useBrowserWallet = (): BrowserWalletState => {
  const {
    showWalletSelectionModal,
    setShowWalletSelectionModal,
    walletSelectionError,
    setWalletSelectionError,
    handleWalletConnect,
    isConnecting,
  } = useContext(AbstraxionContext);

  return {
    showWalletSelectionModal,
    setShowWalletSelectionModal,
    walletSelectionError,
    setWalletSelectionError,
    handleWalletConnect,
    isConnecting,
  };
};
