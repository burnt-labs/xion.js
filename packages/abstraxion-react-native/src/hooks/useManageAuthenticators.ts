import { useCallback, useContext, useSyncExternalStore } from "react";
import { RedirectController } from "@burnt-labs/abstraxion-js";
import type { ManageAuthResult } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";

const signerUnsupportedReason =
  "Manage authenticators is not supported in signer mode. Use redirect authentication to add or remove authenticators.";

export interface UseManageAuthenticatorsReturn {
  /** Open the manage-authenticators flow when supported. */
  manageAuthenticators: () => Promise<void>;
  /** True when the current React Native authentication mode supports manage-authenticators. */
  isSupported: boolean;
  /** Human-readable reason when `isSupported` is false. */
  unsupportedReason: string | undefined;
  /**
   * Populated after the dashboard manage-authenticators flow completes
   * (Expo WebBrowser session resolves). Null until a result is available.
   */
  manageAuthResult: ManageAuthResult | null;
  /** Clear `manageAuthResult` once handled. */
  clearManageAuthResult: () => void;
}

export function useManageAuthenticators(): UseManageAuthenticatorsReturn {
  const { controller, granterAddress } = useContext(AbstraxionContext);

  const isRedirect = controller instanceof RedirectController;
  const isSupported = isRedirect;

  const manageAuthenticators = useCallback(async () => {
    if (!granterAddress) {
      throw new Error(
        "useManageAuthenticators: user is not connected. Call login() first.",
      );
    }

    if (controller instanceof RedirectController) {
      await controller.promptManageAuthenticators(granterAddress);
      return;
    }

    throw new Error(signerUnsupportedReason);
  }, [controller, granterAddress]);

  const manageAuthResult = useSyncExternalStore(
    (cb) =>
      controller instanceof RedirectController
        ? controller.manageAuthResult.subscribe(cb)
        : () => undefined,
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
    unsupportedReason: isSupported ? undefined : signerUnsupportedReason,
    manageAuthResult,
    clearManageAuthResult,
  };
}
