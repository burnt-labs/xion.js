import { useContext, useEffect } from "react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { Dialog, DialogContent } from "@burnt-labs/ui";
import { AbstraxionSignin } from "../AbstraxionSignin";
import { useAbstraxionAccount } from "../../hooks/useAbstraxionAccount";
import { AbstraxionWallets } from "../AbstraxionWallets";
import { ErrorDisplay } from "../ErrorDisplay";
import { AbstraxionGrant } from "../AbstraxionGrant";
import { useQueryParams } from "../../hooks/useQueryParams";
import xionLogo from "../../assets/logo.png";

export interface ModalProps {
  onClose: VoidFunction;
  isOpen: boolean;
}

export const Abstraxion = ({ isOpen, onClose }: ModalProps) => {
  const { contracts, stake, bank, grantee } = useQueryParams([
    "contracts",
    "stake",
    "bank",
    "grantee",
  ]);

  const { abstraxionError, isMainnet } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const { isConnected, data: account } = useAbstraxionAccount();

  let bankArray;
  try {
    bankArray = JSON.parse(bank || "");
  } catch (e) {
    // If the bank is not a valid JSON, we split it by comma. Dapp using old version of the library.
    bankArray = [];
  }

  let contractsArray;
  try {
    contractsArray = JSON.parse(contracts || "");
  } catch (e) {
    // If the contracts are not a valid JSON, we split them by comma. Dapp using old version of the library.
    contractsArray = contracts?.split(",") || [];
  }

  useEffect(() => {
    const closeOnEscKey = (e: any) => (e.key === "Escape" ? onClose() : null);
    document.addEventListener("keydown", closeOnEscKey);
    return () => {
      document.removeEventListener("keydown", closeOnEscKey);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={isMainnet ? "" : "!ui-bg-white/10"}>
          {abstraxionError ? (
            <ErrorDisplay message={abstraxionError} onClose={onClose} />
          ) : account?.id &&
            grantee &&
            // We support granting any combination of
            (contractsArray.length > 0 || stake || bankArray.length > 0) ? (
            <AbstraxionGrant
              bank={bankArray}
              contracts={contractsArray}
              grantee={grantee}
              stake={Boolean(stake)}
            />
          ) : isConnected ? (
            <AbstraxionWallets />
          ) : (
            <AbstraxionSignin />
          )}
        </DialogContent>
      </Dialog>
      {/* TOS Footer */}
      {!isConnected && (
        <div className="ui-absolute ui-pointer-events-auto ui-w-full ui-z-[1000] ui-py-6 ui-px-10 ui-bottom-0 ui-flex ui-flex-col sm:ui-flex-row sm:ui-justify-between sm:ui-items-end">
          <div className="ui-font-akkuratLL ui-text-xs sm:ui-text-sm ui-font-normal ui-text-center sm:ui-text-left">
            <span className="ui-text-neutral-400">
              By continuing, you agree to and acknowledge that you have read and
              understand the
            </span>
            <a href="https://burnt.com" className="ui-pl-1 ui-text-white">
              Disclaimer
            </a>
            <span className="ui-text-neutral-400">.</span>
          </div>
          <div className="ui-flex ui-gap-2 ui-justify-center ui-items-end ui-my-6 sm:ui-my-0">
            <p className="ui-font-akkuratLL ui-text-sm ui-text-zinc-100 ui-opacity-50 leading-tight">
              Powered by
            </p>
            <div className="ui-flex ui-flex-row-reverse ui-items-center sm:ui-items-start  sm:ui-flex-col">
              <div
                className={`ui-flex ui-justify-between ${
                  isMainnet ? "ui-bg-mainnet-bg" : "ui-bg-testnet-bg"
                } ui-px-2 ui-py-1 ui-ml-2 sm:ui-ml-0 sm:ui-mb-2 ${
                  isMainnet ? "ui-text-mainnet" : "ui-text-testnet"
                } ui-rounded-md ui-font-akkuratLL ui-text-xs ui-tracking-widest`}
              >
                {isMainnet ? "MAINNET" : "TESTNET"}
              </div>
              <a href="https://xion.burnt.com/">
                <img src={xionLogo} alt="XION Logo" width="108" height="48" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const AbstraxionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return { children };
};
