import { useContext } from "react";
import { Button, ModalSection } from "@burnt-labs/ui";
import { AbstraxionContext } from "../AbstraxionContext";

export function Connected({ onClose }: { onClose: VoidFunction }): JSX.Element {
  const { logout } = useContext(AbstraxionContext);

  function handleLogout(): void {
    logout();
    onClose();
  }

  return (
    <ModalSection>
      <div className="ui-flex ui-flex-col ui-h-full ui-w-full ui-items-center ui-justify-center ui-text-white">
        <h1 className="ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
          Connected
        </h1>
        <div className="ui-my-4 ui-w-full">
          <Button fullWidth onClick={onClose}>
            Close
          </Button>
        </div>

        <Button fullWidth onClick={handleLogout} structure="destructive">
          Logout
        </Button>
      </div>
    </ModalSection>
  );
}
