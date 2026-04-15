/**
 * useManageAuthenticators
 *
 * Opens the dashboard so the user can add or remove authenticators on their
 * XION account. Supports popup, iframe (embedded), and redirect modes.
 *
 */

import { useCallback, useContext, useSyncExternalStore } from "react";
import { AbstraxionContext } from "../AbstraxionProvider";
import { PopupController } from "../controllers/PopupController";
import { IframeController } from "../controllers/IframeController";
import { RedirectController } from "../controllers/RedirectController";
import type { ManageAuthResult } from "../types";

export interface UseManageAuthenticatorsReturn {
  /** Open the manage-authenticators flow. Resolves when done (popup/iframe) or navigates away (redirect). */
  manageAuthenticators: () => Promise<void>;
  /** True when the current authentication mode supports manage-authenticators. */
  isSupported: boolean;
  /**
   * Populated for redirect mode only — contains the result after the user
   * returns from the dashboard manage-authenticators page. Always null for
   * popup and iframe modes.
   */
  manageAuthResult: ManageAuthResult | null;
  /** Clear `manageAuthResult` once handled. No-op in non-redirect modes. */
  clearManageAuthResult: () => void;
}

export function useManageAuthenticators(): UseManageAuthenticatorsReturn {
  const { controller, granterAddress } = useContext(AbstraxionContext);

  const isSupported =
    controller instanceof PopupController ||
    controller instanceof IframeController ||
    controller instanceof RedirectController;

  const manageAuthenticators = useCallback(async () => {
    if (!granterAddress) {
      throw new Error(
        "useManageAuthenticators: user is not connected. Call login() first.",
      );
    }

    if (
      controller instanceof PopupController ||
      controller instanceof IframeController
    ) {
      return controller.promptManageAuthenticators(granterAddress);
    }

    if (controller instanceof RedirectController) {
      return controller.promptManageAuthenticators(granterAddress);
    }

    throw new Error(
      "useManageAuthenticators is not supported in the current authentication mode. " +
        "Use popup, iframe (embedded), or redirect authentication.",
    );
  }, [controller, granterAddress]);

  // For redirect mode: subscribe to manageAuthResult via useSyncExternalStore
  const manageAuthResult = useSyncExternalStore(
    (cb) =>
      controller instanceof RedirectController
        ? controller.manageAuthResult.subscribe(cb)
        : () => {},
    () =>
      controller instanceof RedirectController
        ? controller.manageAuthResult.snapshot()
        : null,
    () => null,
  );

  const clearManageAuthResult = useCallback(() => {
    if (controller instanceof RedirectController) {
      controller.manageAuthResult.clear();
    }
  }, [controller]);

  return {
    manageAuthenticators,
    isSupported,
    manageAuthResult,
    clearManageAuthResult,
  };
}
