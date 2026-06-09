import { useCallback, useContext, useSyncExternalStore } from "react";
import { RedirectController } from "@burnt-labs/abstraxion-js";
import type { ManageAuthResult } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";

export interface UseManageAuthenticatorsReturn {
  manageAuthenticators: () => Promise<void>;
  isSupported: boolean;
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
    // The runtime throws `manageAuthUnsupportedReason` for non-supported modes.
    return runtime.manageAuthenticators(granterAddress);
  }, [runtime, granterAddress]);

  // Redirect mode stashes the manage-auth result via the strategy after
  // WebBrowser resolves; subscribe so consumers see it.
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
    unsupportedReason,
    manageAuthResult,
    clearManageAuthResult,
  };
}
