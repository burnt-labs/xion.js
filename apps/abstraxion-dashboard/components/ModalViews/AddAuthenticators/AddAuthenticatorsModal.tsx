import { Dispatch, SetStateAction } from "react";
import { CloseIcon, Dialog, DialogClose, DialogContent } from "@burnt-labs/ui";
import { AddAuthenticatorsForm } from "./AddAuthenticatorsForm";

export default function AddAuthenticatorsModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
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
        <AddAuthenticatorsForm setIsOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
