/**
 * Controller factory utilities
 * Creates controller instances based on config
 * Delegates mode-specific logic to controller factory methods
 */

import { BrowserStorageStrategy, BrowserRedirectStrategy } from "../strategies";
import { AbstraxionAuth } from "@burnt-labs/abstraxion-core";
import type { Controller } from "./index";
import { RedirectController, SignerController } from "./index";
import type { NormalizedAbstraxionConfig } from "../types";

/**
 * Create a controller based on authentication config
 * Delegates to controller-specific factory methods
 */
export function createController(
  config: NormalizedAbstraxionConfig,
): Controller {
  const authMode = config.authentication?.type || "redirect";

  // Create shared strategies
  const storageStrategy = new BrowserStorageStrategy();
  const redirectStrategy = new BrowserRedirectStrategy();

  if (authMode === "redirect") {
    // Delegate to RedirectController's factory method
    return RedirectController.fromConfig(
      config,
      storageStrategy,
      redirectStrategy,
    );
  } else if (authMode === "signer") {
    // Signer mode: create AbstraxionAuth with full configuration
    const abstraxionAuth = new AbstraxionAuth(
      storageStrategy,
      redirectStrategy,
    );

    const signerAuth =
      config.authentication?.type === "signer"
        ? config.authentication
        : undefined;
    const treasuryIndexerConfig = signerAuth?.treasuryIndexer;

    // Configure AbstraxionAuth for signer mode
    // Note: Account indexer (Numia/Subquery) is handled by SignerController via account-management,
    // not by AbstraxionAuth
    abstraxionAuth.configureAbstraxionInstance(
      config.rpcUrl,
      config.contracts,
      config.stake,
      config.bank,
      undefined, // callbackUrl - not used in signer mode
      config.treasury,
      treasuryIndexerConfig?.url,
      config.gasPrice,
    );

    // Delegate to SignerController's factory method
    return SignerController.fromConfig(config, storageStrategy, abstraxionAuth);
  } else {
    throw new Error(`Unknown authentication mode: ${authMode}`);
  }
}
