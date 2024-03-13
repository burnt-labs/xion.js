import { ChangeEvent, ReactElement, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Input,
} from "@burnt-labs/ui";
import { useAbstraxionAccount } from "@/hooks";
import { formatBalance, isValidWalletAddress, truncateAddress } from "@/utils";
import { XION_TO_USDC_CONVERSION } from "../Overview";
import { ErrorDisplay } from "../ErrorDisplay";
import { DeliverTxResponse } from "@cosmjs/stargate";
import { DialogClose } from "@burnt-labs/ui";
import { CloseIcon } from "@burnt-labs/ui";

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
  const { data: account } = useAbstraxionAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [sendAmount, setSendAmount] = useState("0");
  const [amountError, setAmountError] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientAddressError, setRecipientAddressError] = useState("");
  const [userMemo, setUserMemo] = useState("");

  const [isOnReviewStep, setIsOnReviewStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sendTokensError, setSendTokensError] = useState(false);

  // TODO: Make dialog only exit onClick of close button

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    setAmountError("");
    if (sendAmount === "0" && event.target.value === "00") return;
    if (!event.target.value) {
      setSendAmount("0");
      return;
    }
    setSendAmount(event.target.value.replace(/^0+/, ""));
  }

  function handleStart() {
    if (!sendAmount || sendAmount === "0") {
      setAmountError("No amount entered");
      return;
    }

    if (balanceInfo.total < Number(sendAmount) * 1000000) {
      setAmountError("Input is greater than your current balance");
      return;
    }

    if (!isValidWalletAddress(recipientAddress)) {
      setRecipientAddressError("Invalid wallet address");
      return;
    }

    setIsOnReviewStep(true);
  }

  async function triggerSend() {
    try {
      setIsLoading(true);

      const res = await sendTokens(
        recipientAddress,
        Number(sendAmount),
        userMemo,
      );
      console.log(res);
      setIsSuccess(true);
    } catch (error) {
      console.log(error);
      setSendTokensError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setAmountError("");
      setSendAmount("0");
      setRecipientAddress("");
      setUserMemo("");
      setIsOnReviewStep(false);
      setIsLoading(false);
      setIsSuccess(false);
      setSendTokensError(false);
    }
  }, [isOpen]);

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
        {sendTokensError ? (
          <ErrorDisplay
            title="ERROR!"
            message="Transaction failed. Please try again later."
            onClose={() => setIsOpen(false)}
          />
        ) : isSuccess ? (
          <>
            <div className="ui-p-0 md:ui-p-8 ui-flex ui-flex-col ui-gap-4">
              <h1 className="ui-w-full ui-text-center ui-text-3xl ui-font-akkuratLL ui-font-thin">
                SUCCESS!
              </h1>
              <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                You have initiated the transaction below.
              </p>
              <div className="ui-my-6 ui-h-[1px] ui-w-full ui-bg-white/20" />
              <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                Transfer Amount
              </p>
              <p className="ui-w-full ui-text-center ui-text-4xl ui-font-akkuratLL ui-text-white ui-font-semibold">
                {sendAmount} <span className="ui-text-white/40">XION</span>
              </p>
              <p className="ui-w-full ui-text-center ui-text-md ui-font-akkuratLL ui-text-white/40">
                $
                {formatBalance(
                  Number(sendAmount) * 1000000 * XION_TO_USDC_CONVERSION,
                )}{" "}
                USD
              </p>
              <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/70 ui-italic">
                {userMemo}
              </p>
              <div className="ui-my-6 ui-h-[1px] ui-w-full ui-bg-white/20" />
              <div>
                <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                  From
                </p>
                <p className="ui-w-full ui-text-center ui-text-xs ui-font-akkuratLL ui-text-white">
                  {account.id}
                </p>
              </div>
              <div className="ui-mb-4">
                <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                  To
                </p>
                <p className="ui-w-full ui-text-center ui-text-xs ui-font-akkuratLL ui-text-white">
                  {recipientAddress}
                </p>
              </div>
              <Button onClick={() => setIsOpen(false)}>GOTCHA</Button>
            </div>
          </>
        ) : isOnReviewStep ? (
          <>
            <div className="ui-p-0 md:ui-p-8 ui-flex ui-flex-col ui-gap-4">
              <h1 className="ui-w-full ui-text-center ui-text-3xl ui-font-akkuratLL ui-font-thin">
                REVIEW
              </h1>
              <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                You are about to make the transaction below.
              </p>
              <div className="ui-my-6 ui-h-[1px] ui-w-full ui-bg-white/20" />
              <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                Transfer Amount
              </p>
              <p className="ui-w-full ui-text-center ui-text-4xl ui-font-akkuratLL ui-text-white ui-font-semibold">
                {sendAmount} <span className="ui-text-white/40">XION</span>
              </p>
              <p className="ui-w-full ui-text-center ui-text-md ui-font-akkuratLL ui-text-white/40">
                $
                {formatBalance(
                  Number(sendAmount) * 1000000 * XION_TO_USDC_CONVERSION,
                )}{" "}
                USD
              </p>
              <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/70 ui-italic">
                {userMemo}
              </p>
              <div className="ui-my-6 ui-h-[1px] ui-w-full ui-bg-white/20" />
              <div>
                <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                  From
                </p>
                <p className="ui-w-full ui-text-center ui-text-xs ui-font-akkuratLL ui-text-white">
                  {account.id}
                </p>
              </div>
              <div className="ui-mb-4">
                <p className="ui-w-full ui-text-center ui-text-sm ui-font-akkuratLL ui-text-white/40">
                  To
                </p>
                <p className="ui-w-full ui-text-center ui-text-xs ui-font-akkuratLL ui-text-white">
                  {recipientAddress}
                </p>
              </div>
              <Button disabled={isLoading} onClick={triggerSend}>
                {isLoading ? "Loading..." : "CONFIRM"}
              </Button>
              <Button
                disabled={isLoading}
                onClick={() => setIsOnReviewStep(false)}
                structure="naked"
              >
                GO BACK
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="ui-w-full ui-text-center ui-text-3xl ui-font-akkuratLL ui-font-thin">
              SEND
            </h1>
            <div className="ui-flex ui-flex-col ui-p-8 ui-gap-8">
              <div className="ui-flex ui-flex-col ui-gap-4">
                <p className="ui-text-white ui-font-semibold">Amount</p>
                <div
                  className={`ui-flex ui-items-center ui-justify-between ui-p-6 ui-border ${
                    amountError ? "ui-border-red-500" : "ui-border-white"
                  } ui-rounded-lg`}
                >
                  <input
                    className="ui-w-full ui-bg-transparent ui-text-white ui-font-bold ui-text-5xl placeholder:ui-text-white/50 focus:ui-outline-none"
                    onChange={handleAmountChange}
                    placeholder="Amount"
                    type="number"
                    value={sendAmount}
                  />
                  <p className="ui-text-5xl ui-font-bold ui-text-white/50">
                    XION
                  </p>
                </div>
                {amountError ? (
                  <p className="ui-text-red-500 ui-text-sm">{amountError}</p>
                ) : null}
              </div>
              <div className="ui-flex ui-flex-col">
                <label className="ui-text-xs ui-text-white/50">From:</label>
                <p className="ui-max-w-sm ui-overflow-scroll">
                  {truncateAddress(account.id)}
                </p>
              </div>
              <Input
                error={recipientAddressError}
                onChange={(e) => {
                  setRecipientAddressError("");
                  setRecipientAddress(e.target.value);
                }}
                placeholder="Recipient Address"
                value={recipientAddress}
              />
              <Input
                onChange={(e) => setUserMemo(e.target.value)}
                placeholder="Memo (Optional)"
                value={userMemo}
              />
              <Button onClick={handleStart}>REVIEW</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
