"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccountInfo } from "@/components/AccountInfo";
import { Overview } from "@/components/Overview";
import { Sidebar } from "@/components/Sidebar";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import { ChevronDownIcon, WalletIcon } from "@/components/Icons";
import { Abstraxion } from "@/components/Abstraxion";
import {
  AbstraxionAccount,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "../hooks";

export default function Home() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const accountBalance = useAccountBalance(account, client);

  const contracts = searchParams.get("contracts");
  const grantee = searchParams.get("grantee");

  function getTimestampInSeconds(date: Date | null) {
    if (!date) return 0;
    const d = new Date(date);
    return Math.floor(d.getTime() / 1000);
  }

  const now = new Date();
  now.setSeconds(now.getSeconds() + 15);
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const seatContractAddress =
    "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

  async function claimSeat() {
    const msg = {
      sales: {
        claim_item: {
          token_id: String(getTimestampInSeconds(now)),
          owner: account.id,
          token_uri: "",
          extension: {},
        },
      },
    };

    try {
      const claimRes = await client?.execute(
        account.id,
        seatContractAddress,
        msg,
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
        "",
        [],
      );

      console.log(claimRes);
    } catch (error) {
      // eslint-disable-next-line no-console -- No UI exists yet to display errors
      console.log(error);
    }
  }

  return (
    <>
      {!account?.id || (contracts && grantee) ? (
        <div className="ui-flex ui-h-screen ui-flex-1 ui-items-center ui-justify-center ui-overflow-y-auto ui-p-6">
          <Abstraxion onClose={() => null} isOpen={true} />
        </div>
      ) : (
        <>
          <Sidebar />
          <div className="ui-h-screen ui-flex-1 ui-overflow-y-auto ui-p-6">
            <div className="ui-relative">
              <Abstraxion onClose={() => setIsOpen(false)} isOpen={isOpen} />
              {/* Header */}
              <div className="ui-mb-8 ui-flex ui-items-center ui-justify-between">
                <h1 className="ui-font-akkuratLL ui-leading-wide ui-text-4xl ui-font-bold">
                  Welcome Home!
                </h1>
                <button
                  className="ui-flex ui-h-12 ui-w-52 ui-items-center ui-rounded ui-bg-slate-100"
                  onClick={() => setIsOpen(true)}
                >
                  <div className="ui-mx-2 ui-h-8 ui-w-8 ui-items-center ui-justify-center ui-rounded-full ui-bg-black">
                    <WalletIcon color="white" backgroundColor="black" />
                  </div>
                  <p className="ui-font-akkuratLL ui-font-medium">
                    Personal Account
                  </p>
                  <ChevronDownIcon />
                </button>
                <button onClick={claimSeat}>CLICK</button>
              </div>
              {/* Tiles */}
              <div className="ui-mx-auto ui-flex ui-max-w-7xl">
                {/* Left Tiles */}
                <div className="ui-flex-grow-2 ui-flex ui-flex-col">
                  <h3 className="ui-font-akkuratLL ui-mb-4 ui-text-base ui-font-bold">
                    Overview
                  </h3>
                  <Overview balanceInfo={accountBalance} />
                  <h3 className="ui-font-akkuratLL ui-mb-4 ui-mt-8 ui-text-base ui-font-bold ui-text-black">
                    Account Info
                  </h3>
                  <AccountInfo account={account as AbstraxionAccount} />
                </div>
                {/* Right Tiles */}
                <div className="ui-flex ui-flex-1 ui-flex-col"></div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
