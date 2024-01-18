import { useContext } from "react";
import { Button, ModalSection } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";

export function Connected({ onClose }: { onClose: VoidFunction }) {
  const { setIsConnected, setAbstraxionAccount, setGrantorAddress } =
    useContext(AbstraxionContext) as AbstraxionContextProps;

  function handleLogout() {
    setIsConnected(false);
    localStorage.removeItem("xion-authz-temp-account");
    localStorage.removeItem("xion-authz-grantor-account");
    setAbstraxionAccount(undefined);
    setGrantorAddress("");
    onClose();
  }

  return (
    <ModalSection>
      <div className="ui-flex ui-flex-col ui-h-full ui-w-full ui-items-center ui-justify-center ui-text-white">
        <h1 className="ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
          Connected
        </h1>
        <Button fullWidth onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </ModalSection>
  );
}
