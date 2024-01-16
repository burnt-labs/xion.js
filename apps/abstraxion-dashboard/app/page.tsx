"use client";

import { AccountInfo } from "@/components/AccountInfo";
import { Overview } from "@/components/Overview";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import { ChevronDownIcon, WalletIcon } from "@/components/Icons";
import { Abstraxion } from "@/components/Abstraxion";
import {
  AbstraxionAccount,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "../hooks";
import { useSearchParams } from "next/navigation";

export interface AccountWithAuthenticator extends AbstraxionAccount {
  authenticators: Authenticators;
}

export default function Home() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const accountBalance = useAccountBalance(account, client);

  const permissions = searchParams.get("permissions");
  const grantee = searchParams.get("grantee");

  return (
    <>
      {!account?.bech32Address || (permissions && grantee) ? (
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
                  <AccountInfo account={account as AccountWithAuthenticator} />
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
