/**
 * Controller factory utilities
 * Creates controller instances based on config
 */

import { BrowserStorageStrategy, BrowserRedirectStrategy } from '../strategies';
import { AbstraxionAuth } from '@burnt-labs/abstraxion-core';
import { createCompositeAccountStrategy, extractIndexerAuthToken, convertIndexerConfig, type SessionManager } from '@burnt-labs/account-management';
import type { Controller } from '../controllers';
import { RedirectController, SignerController } from '../controllers';
import type { RedirectControllerConfig, SignerControllerConfig } from '../controllers';
import type { NormalizedAbstraxionConfig, IndexerConfig } from '../types';

/**
 * Create a controller based on authentication config
 * Supports redirect and signer modes only
 */
export function createController(
  config: NormalizedAbstraxionConfig,
): Controller {
  const authMode = config.authentication?.type || 'redirect';
  
  const baseConfig = {
    chainId: config.chainId,
    rpcUrl: config.rpcUrl,
    gasPrice: config.gasPrice,
  };
  
  // Create storage and redirect strategies
  const storageStrategy = new BrowserStorageStrategy();
  const redirectStrategy = new BrowserRedirectStrategy();
  
  // Create AbstraxionAuth instance (implements SessionManager)
  const abstraxionAuth = new AbstraxionAuth(storageStrategy, redirectStrategy);
  
  const signerAuth = config.authentication?.type === 'signer' ? config.authentication : undefined;
  const smartAccountContract = signerAuth?.smartAccountContract;
  const indexerConfig = signerAuth?.indexer;
  const treasuryIndexerConfig = signerAuth?.treasuryIndexer;
  
  // Extract authToken for AbstraxionAuth (only available for Numia indexers)
  // IndexerConfig matches UserIndexerConfig shape, so this is type-safe
  const indexerAuthToken = extractIndexerAuthToken(indexerConfig);
  
  abstraxionAuth.configureAbstraxionInstance(
    config.rpcUrl,
    config.contracts,
    config.stake,
    config.bank,
    config.authentication?.type === 'redirect' ? config.authentication.callbackUrl : undefined,
    config.treasury,
    indexerConfig?.url,
    indexerAuthToken,
    treasuryIndexerConfig?.url, // Get treasury indexer from signer auth
    config.gasPrice, // Pass gasPrice (from normalized config, defaults to xionGasValues.gasPrice)
    config.authentication?.type === 'redirect' ? config.authentication.dashboardUrl : undefined,
  );
  
  // Create account strategy
  // IndexerConfig matches UserIndexerConfig shape, so this is type-safe
  const accountStrategy = createCompositeAccountStrategy({
    indexer: convertIndexerConfig(indexerConfig, smartAccountContract),
    rpc: smartAccountContract ? {
      rpcUrl: config.rpcUrl,
      checksum: smartAccountContract.checksum,
      creator: config.feeGranter || '', // Use top-level feeGranter from config
      prefix: smartAccountContract.addressPrefix,
      codeId: smartAccountContract.codeId,
    } : undefined,
  });
  
  // Create grant config (only used in signer mode)
  const grantConfig = config.treasury || config.contracts || config.bank || config.stake ? {
    treasury: config.treasury,
    contracts: config.contracts,
    bank: config.bank,
    stake: config.stake,
    feeGranter: config.feeGranter,
    daodaoIndexerUrl: signerAuth?.treasuryIndexer?.url,
  } : undefined;
  
  if (smartAccountContract && !config.feeGranter) {
    throw new Error('feeGranter is required in AbstraxionConfig when using signer mode with smartAccountContract');
  }
  
  const accountCreationConfigForController = smartAccountContract && config.feeGranter ? {
    aaApiUrl: signerAuth?.aaApiUrl || '',
    smartAccountContract: {
      codeId: smartAccountContract.codeId,
      checksum: smartAccountContract.checksum,
      addressPrefix: smartAccountContract.addressPrefix,
    },
    feeGranter: config.feeGranter,
  } : undefined;
  
  // TODO: review this logic or change dashboard
  if (authMode === 'redirect') {
    // For redirect mode, ensure at least one grant parameter is present
    // This ensures the dashboard shows AbstraxionGrant and redirects back
    // If no grant config is provided, use a minimal bank grant as fallback
    const hasGrantConfig = config.treasury || config.contracts || config.bank || config.stake;
    const fallbackBank = hasGrantConfig ? undefined : [{ denom: "uxion", amount: "0.1" }];
    
    const redirectConfig: RedirectControllerConfig = {
      ...baseConfig,
      redirect: {
        type: 'redirect',
        dashboardUrl: config.authentication?.type === 'redirect' ? config.authentication.dashboardUrl : undefined,
        callbackUrl: config.authentication?.type === 'redirect' ? config.authentication.callbackUrl : undefined,
      },
      storageStrategy,
      redirectStrategy,
      treasury: config.treasury, // Pass treasury so it's included in redirect URL
      bank: config.bank || fallbackBank, // Use provided bank or fallback minimal grant
      stake: config.stake,
      contracts: config.contracts,
    };
    
    return new RedirectController(redirectConfig);
  } else if (authMode === 'signer') {
    if (config.authentication?.type !== 'signer') {
      throw new Error('Signer authentication config required for signer mode');
    }
    
    const signerConfig: SignerControllerConfig = {
      ...baseConfig,
      signer: config.authentication,
      accountStrategy,
      grantConfig,
      accountCreationConfig: accountCreationConfigForController,
      sessionManager: abstraxionAuth as SessionManager, // AbstraxionAuth implements SessionManager
      storageStrategy,
    };
    
    return new SignerController(signerConfig);
  } else {
    throw new Error(`Unknown authentication mode: ${authMode}`);
  }
}

