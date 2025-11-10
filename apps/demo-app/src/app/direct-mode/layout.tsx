"use client";
import { useMemo, createContext, useContext } from "react";
import {
  AbstraxionProvider,
  type AbstraxionConfig,
  type SignerConfig,
  useConnectorSelection,
} from "@burnt-labs/abstraxion";
import { WalletModal } from "../../components/WalletModal";
import { KeplrConnector, MetaMaskConnector } from "./connectors";

// Context to share setShowModal between layout and page
interface DirectModeContextType {
  setShowModal: (show: boolean) => void;
}

const DirectModeContext = createContext<DirectModeContextType | null>(null);

export function useDirectMode() {
  const context = useContext(DirectModeContext);
  if (!context) {
    throw new Error("useDirectMode must be used within DirectModeLayout");
  }
  return context;
}

/**
 * Direct Mode Content - manages connectors and modal state
 */
function DirectModeContent({ children }: { children: React.ReactNode }) {
  // Create connector instances
  const connectors = useMemo(() => [
    new KeplrConnector(),
    new MetaMaskConnector(),
  ], []);

  // Use connector selection hook - single source of truth for modal state
  const connectorSelection = useConnectorSelection({
    connectors,
    aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL,
  });

  return (
    <DirectModeContext.Provider value={{ setShowModal: connectorSelection.setShowModal }}>
      {children}
      {/* Wallet modal - receives all hook results as props */}
      <WalletModal 
        connectors={connectors}
        showModal={connectorSelection.showModal}
        setShowModal={connectorSelection.setShowModal}
        availableConnectors={connectorSelection.availableConnectors}
        connect={connectorSelection.connect}
        error={connectorSelection.error}
        isConnecting={connectorSelection.isConnecting}
      />
    </DirectModeContext.Provider>
  );
}

export default function DirectModeLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  // Build indexer config (supports both Numia and Subquery)
  const indexerConfig = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_INDEXER_URL) return undefined;

    // If type is explicitly set to subquery, use Subquery
    if (process.env.NEXT_PUBLIC_INDEXER_TYPE === 'subquery') {
      if (!process.env.NEXT_PUBLIC_CODE_ID) {
        throw new Error('NEXT_PUBLIC_CODE_ID is required when using Subquery indexer');
      }
      return {
        type: 'subquery' as const,
        url: process.env.NEXT_PUBLIC_INDEXER_URL,
        codeId: parseInt(process.env.NEXT_PUBLIC_CODE_ID),
      };
    }

    // Otherwise, use Numia (default)
    if (process.env.NEXT_PUBLIC_INDEXER_TOKEN) {
      return {
        type: 'numia' as const,
        url: process.env.NEXT_PUBLIC_INDEXER_URL,
        authToken: process.env.NEXT_PUBLIC_INDEXER_TOKEN,
      };
    }

    return undefined;
  }, []);

  // Smart account contract configuration (required for signer mode)
  const smartAccountContractConfig = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_CODE_ID || !process.env.NEXT_PUBLIC_CHECKSUM) {
      throw new Error('Smart account contract config is required for direct mode. Please provide NEXT_PUBLIC_CODE_ID and NEXT_PUBLIC_CHECKSUM.');
    }
    return {
      codeId: parseInt(process.env.NEXT_PUBLIC_CODE_ID),
      checksum: process.env.NEXT_PUBLIC_CHECKSUM,
      addressPrefix: process.env.NEXT_PUBLIC_ADDRESS_PREFIX || 'xion',
    };
  }, []);

  // Configuration for AbstraxionProvider
  // Uses signer mode with connectors - the useConnectorSelection hook handles the actual connector connection
  const directModeConfig: AbstraxionConfig = useMemo(() => ({
    // REQUIRED: Chain ID
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID || "xion-testnet-2",

    // REQUIRED: RPC URL for blockchain connection
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,

    // REQUIRED: REST API endpoint
    restUrl: process.env.NEXT_PUBLIC_REST_URL!,

    // REQUIRED: Gas price
    gasPrice: process.env.NEXT_PUBLIC_GAS_PRICE || "0.001uxion",

    // Treasury contract address (optional - for dynamic grant configs)
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,

    // Fee granter address (required for grant creation and smart account creation)
    feeGranter: process.env.NEXT_PUBLIC_FEE_GRANTER_ADDRESS,

    // Signer-mode configuration
    authentication: {
      type: "signer" as const,
      
      // AA API URL for account creation
      aaApiUrl: process.env.NEXT_PUBLIC_AA_API_URL!,
      
      // Function that returns signer configuration
      // Note: This is required by the type but useConnectorSelection bypasses it
      // by using orchestrator directly. This function should not be called when using connectors.
      getSignerConfig: async (): Promise<SignerConfig> => {
        throw new Error(
          'getSignerConfig should not be called when using connectors via useConnectorSelection. ' +
          'The connection flow is handled by the useConnectorSelection hook.'
        );
      },
      
      // Auto-connect behavior
      autoConnect: false, // Manual login - wait for user to click connect
      
      // Smart account contract configuration (codeId, checksum, addressPrefix)
      smartAccountContract: smartAccountContractConfig,
      
      // Indexer configuration for account discovery (optional - falls back to RPC if not provided)
      indexer: indexerConfig,
      
      // Treasury indexer configuration - for fetching grant configs from DaoDao indexer (fast)
      // Optional - falls back to direct RPC queries if not provided
      treasuryIndexer: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL ? {
        url: process.env.NEXT_PUBLIC_TREASURY_INDEXER_URL,
      } : undefined,
    },
  }), [indexerConfig, smartAccountContractConfig]);

  return (
    <AbstraxionProvider config={directModeConfig}>
      <DirectModeContent>{children}</DirectModeContent>
    </AbstraxionProvider>
  );
}
