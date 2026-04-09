/**
 * useAddAuthenticators
 *
 * Opens the dashboard so the user can add a new authenticator to their XION
 * account. Supports popup, iframe (embedded), and redirect modes.
 *
 */

import { useCallback, useContext, useSyncExternalStore } from "react";
import { AbstraxionContext } from "../AbstraxionProvider";
import { PopupController } from "../controllers/PopupController";
import { IframeController } from "../controllers/IframeController";
import { RedirectController } from "../controllers/RedirectController";
import type { AddAuthResult } from "../types";

export interface UseAddAuthenticatorsReturn {
  /** Open the add-authenticators flow. Resolves when done (popup/iframe) or navigates away (redirect). */
  addAuthenticators: () => Promise<void>;
  /** True when the current authentication mode supports add-authenticators. */
  isSupported: boolean;
  /**
   * Populated for redirect mode only — contains the result after the user
   * returns from the dashboard add-authenticators page. Always null for
   * popup and iframe modes.
   */
  addAuthResult: AddAuthResult | null;
  /** Clear `addAuthResult` once handled. No-op in non-redirect modes. */
  clearAddAuthResult: () => void;
}

export function useAddAuthenticators(): UseAddAuthenticatorsReturn {
  const { controller, granterAddress } = useContext(AbstraxionContext);

  const isSupported =
    controller instanceof PopupController ||
    controller instanceof IframeController ||
    controller instanceof RedirectController;

  const addAuthenticators = useCallback(async () => {
    if (!granterAddress) {
      throw new Error(
        "useAddAuthenticators: user is not connected. Call login() first.",
      );
    }

    if (
      controller instanceof PopupController ||
      controller instanceof IframeController
    ) {
      return controller.promptAddAuthenticators(granterAddress);
    }

    if (controller instanceof RedirectController) {
      return controller.promptAddAuthenticators(granterAddress);
    }

    throw new Error(
      "useAddAuthenticators is not supported in the current authentication mode. " +
        "Use popup, iframe (embedded), or redirect authentication.",
    );
  }, [controller, granterAddress]);

  // For redirect mode: subscribe to addAuthResult via useSyncExternalStore
  const addAuthResult = useSyncExternalStore(
    (cb) => controller instanceof RedirectController ? controller.addAuthResult.subscribe(cb) : () => {},
    () => controller instanceof RedirectController ? controller.addAuthResult.snapshot() : null,
    () => null,
  );

  const clearAddAuthResult = useCallback(() => {
    if (controller instanceof RedirectController) {
      controller.addAuthResult.clear();
    }
  }, [controller]);

  return { addAuthenticators, isSupported, addAuthResult, clearAddAuthResult };
}
