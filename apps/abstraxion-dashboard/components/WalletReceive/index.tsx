import { ReactElement, useState } from "react";
import { Button, Dialog, DialogContent, DialogTrigger } from "@burnt-labs/ui";
import { DialogClose } from "@burnt-labs/ui";
import { CloseIcon } from "@burnt-labs/ui";
import { truncateAddress } from "@/utils";
import { CopyIcon } from "../Icons";
import { QRCodeSVG } from "qrcode.react";

export function WalletReceive({
  trigger,
  xionAddress,
}: {
  trigger: ReactElement;
  xionAddress: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const copyXionAddress = () => {
    if (xionAddress) {
      navigator.clipboard.writeText(xionAddress);
    }
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent
        className="ui-text-white"
        onPointerDownOutside={(e: any) => e.preventDefault()}
      >
        <DialogClose className="ui-absolute ui-top-5 ui-right-10">
          <CloseIcon className="ui-stroke-white/50" />
        </DialogClose>
        <div className="ui-flex ui-flex-col ui-pt-8">
          <h1 className="ui-w-full ui-text-center ui-text-3xl ui-font-akkuratLL ui-font-thin">
            RECEIVE
          </h1>
          <h3 className="ui-text-white ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none ui-my-6">
            XION Address
          </h3>
          <div
            onClick={copyXionAddress}
            className="ui-flex ui-cursor-pointer ui-items-center ui-justify-between ui-px-4 ui-w-full ui-h-16 ui-bg-black ui-rounded-lg"
          >
            <p className="ui-text-white ui-text-base ui-font-normal ui-font-akkuratLL ui-leading-normal">
              {truncateAddress(xionAddress)}
            </p>
            <CopyIcon color="white" />
          </div>
          <div className="ui-flex ui-items-center ui-justify-center ui-my-6 ui-p-6 ui-w-full ui-bg-black ui-rounded-lg">
            <QRCodeSVG value={"uxion:" + xionAddress} />
          </div>
          <Button onClick={() => setIsOpen(false)} fullWidth>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
