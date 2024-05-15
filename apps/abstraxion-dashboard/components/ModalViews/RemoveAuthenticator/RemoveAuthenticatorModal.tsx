import { Dispatch, SetStateAction } from "react";
import { CloseIcon, Dialog, DialogClose, DialogContent } from "@burnt-labs/ui";
import { RemoveAuthenticatorForm } from "./RemoveAuthenticatorForm";
import type { AuthenticatorNodes } from "@/types";

export default function RemoveAuthenticatorModal({
  isOpen,
  setIsOpen,
  authenticator,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  authenticator?: AuthenticatorNodes;
}) {
  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent
        className="ui-text-white"
        onPointerDownOutside={(e: any) => e.preventDefault()}
      >
        <DialogClose className="ui-absolute ui-top-5 ui-right-10">
          <CloseIcon className="ui-stroke-white/50" />
        </DialogClose>
        <RemoveAuthenticatorForm
          authenticator={authenticator}
          setIsOpen={setIsOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
