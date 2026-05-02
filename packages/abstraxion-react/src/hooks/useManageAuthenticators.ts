/**
 * useManageAuthenticators
 *
 * Opens the dashboard so the user can add or remove authenticators on their
 * XION account. Supports popup, iframe (embedded), and redirect modes.
 *
 * Delegates to `runtime.manageAuthenticators` / `runtime.isManageAuthSupported`
 * so the same logic powers React, React Native, Svelte, and any other
 * framework wrapper.
 */

import { useCallback, useContext, useSyncExternalStore } from "react";
import { RedirectController } from "@burnt-labs/abstraxion-js";
import type { ManageAuthResult } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../AbstraxionProvider";

export interface UseManageAuthenticatorsReturn {
  manageAuthenticators: () => Promise<void>;
  isSupported: boolean;
  /** Human-readable reason when `isSupported` is false; `undefined` otherwise. */
  unsupportedReason: string | undefined;
  manageAuthResult: ManageAuthResult | null;
  clearManageAuthResult: () => void;
}

export function useManageAuthenticators(): UseManageAuthenticatorsReturn {
  const { runtime, controller, granterAddress } = useContext(AbstraxionContext);

  const isSupported = runtime?.isManageAuthSupported ?? false;
  const unsupportedReason = isSupported
    ? undefined
    : (runtime?.manageAuthUnsupportedReason ??
      "useManageAuthenticators: AbstraxionProvider is not mounted.");

  const manageAuthenticators = useCallback(async () => {
    if (!runtime) {
      throw new Error(
        "useManageAuthenticators: AbstraxionProvider is not mounted.",
      );
    }
    if (!granterAddress) {
      throw new Error(
        "useManageAuthenticators: user is not connected. Call login() first.",
      );
    }
    return runtime.manageAuthenticators(granterAddress);
  }, [runtime, granterAddress]);

  // Redirect mode: the manage-auth result survives the navigation round-trip
  // via the controller's manageAuthResult store. Subscribe via
  // useSyncExternalStore so consumers see the result on return.
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
    unsupportedReason,
    manageAuthResult,
    clearManageAuthResult,
  };
}
