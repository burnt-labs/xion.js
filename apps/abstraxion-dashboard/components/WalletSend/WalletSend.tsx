import { ReactElement, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@burnt-labs/ui";
import { DeliverTxResponse } from "@cosmjs/stargate";
import { DialogClose } from "@burnt-labs/ui";
import { CloseIcon } from "@burnt-labs/ui";
import { WalletSendForm } from "./WalletSendForm";

export function WalletSend({
  trigger,
  sendTokens,
  balanceInfo,
}: {
  trigger: ReactElement;
  sendTokens: (
    senderAddress: string,
    sendAmount: number,
    memo: string,
  ) => Promise<DeliverTxResponse>;
  balanceInfo: BalanceInfo;
}) {
  const [isOpen, setIsOpen] = useState(false);

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
        <WalletSendForm
          balanceInfo={balanceInfo}
          sendTokens={sendTokens}
          setIsOpen={setIsOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
