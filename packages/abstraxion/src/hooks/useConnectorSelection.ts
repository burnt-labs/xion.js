/**
 * Hook for connector selection with modal UI
 * Works with custom connectors and connects to Abstraxion's state machine
 */

import { useContext, useCallback, useState, useEffect,useRef } from "react";
import { AbstraxionContext } from "../components/AbstraxionContext";
import type { Connector } from "@burnt-labs/abstraxion-core";
import { ConnectorRegistry } from "@burnt-labs/abstraxion-core";
import { ConnectionOrchestrator } from "@burnt-labs/account-management";
import { createCompositeAccountStrategy } from "@burnt-labs/account-management";
import type { SessionManager } from "@burnt-labs/account-management";
import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";
import { BrowserStorageStrategy, BrowserRedirectStrategy } from "../strategies";

export interface UseConnectorSelectionOptions {
  /** Array of connector instances to choose from */
  connectors: Connector[];
  
  /** AA API URL (required for account creation, optional - can come from env) */
  aaApiUrl?: string;
}

export interface UseConnectorSelectionReturn {
  /** Available connectors (checked via isAvailable()) */
  availableConnectors: Connector[];
  
  /** Whether to show the connector selection modal */
  showModal: boolean;
  
  /** Set whether to show the modal */
  setShowModal: (show: boolean) => void;
  
  /** Connect to a specific connector */
  connect: (connector: Connector) => Promise<void>;
  
  /** Connection error, if any */
  error: string | null;
  
  /** Whether a connection is in progress (from AbstraxionContext) */
  isConnecting: boolean;
  
  /** Whether initialization is in progress (from AbstraxionContext) */
  isInitializing: boolean;
  
  /** Whether connected (from AbstraxionContext) */
  isConnected: boolean;
}

/**
 * Hook for connector selection with modal UI
 * Integrates with Abstraxion's state machine for loading states
 * Reads all configuration from AbstraxionContext - only requires connectors
 * 
 */
export function useConnectorSelection(
  options: UseConnectorSelectionOptions
): UseConnectorSelectionReturn {
  const { connectors, aaApiUrl } = options;

  // Get all config and state from AbstraxionContext
  const context = useContext(AbstraxionContext);
  const {
    chainId,
    rpcUrl,
    gasPrice,
    treasury,
    feeGranter,
    contracts,
    stake,
    bank,
    indexerUrl,
    indexerAuthToken,
    treasuryIndexerUrl,
    authMode,
    isConnecting,
    isInitializing,
    isConnected,
  } = context;

  // Get account creation config from signer authentication if in signer mode
  const smartAccountContract = authMode === 'signer' && context.authentication?.type === 'signer'
    ? context.authentication.smartAccountContract
    : undefined;
  
  // Get indexer config from signer authentication to determine type
  const indexerConfig = authMode === 'signer' && context.authentication?.type === 'signer'
    ? context.authentication.indexer
    : undefined;

  // Local state for error, available connectors, and modal
  const [error, setError] = useState<string | null>(null);
  const [availableConnectors, setAvailableConnectors] = useState<Connector[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Use refs to persist orchestrator and connectorRegistry across renders
  // Similar to how AbstraxionContext uses refs for the controller
  const connectorRegistryRef = useRef<ConnectorRegistry | null>(null);
  const orchestratorRef = useRef<ConnectionOrchestrator | null>(null);
  const configRef = useRef<{
    chainId: string;
    rpcUrl: string;
    gasPrice: string;
    treasury?: string;
    feeGranter?: string;
    contracts?: any[];
    stake?: boolean;
    bank?: any[];
    indexerUrl?: string;
    indexerAuthToken?: string;
    treasuryIndexerUrl?: string;
    smartAccountContract?: any;
    aaApiUrl?: string;
    indexerConfig?: any;
    connectorIds?: string[];
  } | null>(null);

  // Create or update connector registry when connectors change
  if (!connectorRegistryRef.current) {
    connectorRegistryRef.current = new ConnectorRegistry();
    connectorRegistryRef.current.registerAll(connectors);
  } else {
    // Update registry if connectors changed
    const currentConnectorIds = new Set(connectors.map((c: Connector) => c.metadata.id));
    const registeredIds = new Set(Array.from(connectorRegistryRef.current.getAll().map((c: Connector) => c.metadata.id)));
    
    // Check if connectors have changed
    const connectorsChanged = 
      connectors.length !== registeredIds.size ||
      connectors.some(c => !registeredIds.has(c.metadata.id)) ||
      Array.from(registeredIds).some(id => !currentConnectorIds.has(id));
    
    if (connectorsChanged) {
      connectorRegistryRef.current.clear();
      connectorRegistryRef.current.registerAll(connectors);
    }
  }

  const connectorRegistry = connectorRegistryRef.current;

  // Create or update orchestrator when config changes
  const currentConfig = {
    chainId,
    rpcUrl,
    gasPrice,
    treasury,
    feeGranter,
    contracts,
    stake,
    bank,
    indexerUrl,
    indexerAuthToken,
    treasuryIndexerUrl,
    smartAccountContract,
    aaApiUrl,
    indexerConfig,
    // Note: connectors are handled separately via connectorRegistry
    // so we compare connector IDs instead of the instances themselves
    connectorIds: connectors.map(c => c.metadata.id).sort(),
  };

  // Check if config has changed
  const configChanged = !configRef.current || 
    JSON.stringify(configRef.current) !== JSON.stringify(currentConfig);

  if (!orchestratorRef.current || configChanged) {
    const storageStrategy = new BrowserStorageStrategy();
    const redirectStrategy = new BrowserRedirectStrategy();
    const abstraxionAuth = new AbstraxionAuth(storageStrategy, redirectStrategy);

    // Configure AbstraxionAuth instance (must be done before casting to SessionManager)
    abstraxionAuth.configureAbstraxionInstance(
      rpcUrl,
      contracts,
      stake,
      bank,
      undefined, // callbackUrl
      treasury,
      indexerUrl,
      indexerAuthToken,
      treasuryIndexerUrl,
    );

    // AbstraxionAuth implements SessionManager interface but setGranter is private
    // Type assertion is safe here as all required methods exist
    const sessionManager = abstraxionAuth as unknown as SessionManager;

    // Determine indexer type from config if available, otherwise auto-detect
    // Respect the type specified in the config (numia or subquery)
    const indexerType = indexerConfig?.type || (smartAccountContract?.codeId && indexerUrl ? 'subquery' : 'numia');

    // Create account strategy
    const accountStrategy = createCompositeAccountStrategy({
      indexer: indexerUrl ? (indexerType === 'subquery' && smartAccountContract?.codeId
        ? {
            type: 'subquery' as const,
            url: indexerUrl,
            codeId: smartAccountContract.codeId,
          }
        : {
            type: 'numia' as const,
            url: indexerUrl,
            authToken: indexerAuthToken,
          }) : undefined,
      rpc: smartAccountContract && feeGranter ? {
        rpcUrl,
        checksum: smartAccountContract.checksum,
        creator: feeGranter, // Use top-level feeGranter from context
        prefix: smartAccountContract.addressPrefix,
        codeId: smartAccountContract.codeId,
      } : undefined,
    });

    // Create account creation config if needed
    const accountCreationConfigForOrchestrator = aaApiUrl && smartAccountContract && feeGranter ? {
      aaApiUrl,
      smartAccountContract: {
        codeId: smartAccountContract.codeId,
        checksum: smartAccountContract.checksum,
        addressPrefix: smartAccountContract.addressPrefix,
      },
      feeGranter: feeGranter, // Use top-level feeGranter from context
    } : undefined;

    // Create grant config if any grant-related config is present
    const grantConfig = treasury || contracts || bank || stake ? {
      treasury,
      contracts,
      bank,
      stake,
      feeGranter,
      daodaoIndexerUrl: treasuryIndexerUrl,
    } : undefined;

    orchestratorRef.current = new ConnectionOrchestrator({
      sessionManager,
      storageStrategy,
      accountStrategy,
      grantConfig,
      accountCreationConfig: accountCreationConfigForOrchestrator,
      chainId,
      rpcUrl,
      gasPrice,
    });

    // Update config ref for next comparison
    configRef.current = currentConfig;
  }

  const orchestrator = orchestratorRef.current;

  // Check available connectors on mount and when connectors change
  // Uses ConnectorRegistry.getAvailable() - same pattern as DirectController
  useEffect(() => {
    if (!connectorRegistry) return;
    
    const checkAvailable = async () => {
      try {
        const available = await connectorRegistry.getAvailable();
        setAvailableConnectors(available);
      } catch (err) {
        console.error('[useConnectorSelection] Failed to check available connectors:', err);
        setAvailableConnectors([]);
      }
    };

    checkAvailable();
  }, [connectorRegistry, connectors]);

  // Connect to a specific connector
  const connect = useCallback(async (connector: Connector) => {
    setError(null);
    setShowModal(false);

    try {
      // Use orchestrator to connect and setup
      await orchestrator.connectAndSetup(connector);
      
      // Connection successful - reload page to sync state with AbstraxionContext
      // The orchestrator stores the session, so AbstraxionContext will restore it on reload
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      console.error('[useConnectorSelection] Connection error:', err);
      throw err;
    }
  }, [orchestrator]);

  return {
    availableConnectors,
    showModal,
    setShowModal,
    connect,
    error,
    isConnecting,
    isInitializing,
    isConnected,
  };
}

