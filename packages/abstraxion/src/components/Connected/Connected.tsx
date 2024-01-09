import { useContext } from "react";
import { Button, ModalSection } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";

export function Connected() {
  const { setIsConnected } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  function handleLogout() {
    localStorage.removeItem("xion-authz-temp-account");
    setIsConnected(false);
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
