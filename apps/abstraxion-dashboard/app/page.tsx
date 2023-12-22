"use client";

import { AccountInfo } from "@/components/AccountInfo";
import { Overview } from "@/components/Overview";

import {
  Abstraxion,
  AbstraxionAccount,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import { ChevronDownIcon, WalletIcon } from "@/components/Icons";

export interface AccountWithAuthenticator extends AbstraxionAccount {
  authenticators: Authenticators;
}

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const accountBalance = useAccountBalance(account, client);

  return (
    <>
      {!account?.bech32Address ? (
        <div className="flex h-screen justify-center items-center overflow-y-auto flex-1 p-6">
          <Abstraxion onClose={() => null} isOpen={true} />
        </div>
      ) : (
        <>
          <Sidebar />
          <div className="h-screen overflow-y-auto flex-1 p-6">
            <div className="relative">
              <Abstraxion onClose={() => setIsOpen(false)} isOpen={isOpen} />
              {/* Header */}
              <div className="flex justify-between mb-8 items-center">
                <h1 className="font-akkuratLL text-4xl font-bold leading-wide">
                  Welcome Home!
                </h1>
                <button
                  className="flex items-center w-52 h-12 bg-slate-100 rounded"
                  onClick={() => setIsOpen(true)}
                >
                  <div className="w-8 h-8 mx-2 bg-black items-center justify-center rounded-full">
                    <WalletIcon color="white" backgroundColor="black" />
                  </div>
                  <p className="font-akkuratLL font-medium">Personal Account</p>
                  <ChevronDownIcon />
                </button>
              </div>
              {/* Tiles */}
              <div className="flex max-w-7xl mx-auto">
                {/* Left Tiles */}
                <div className="flex flex-col flex-2">
                  <h3 className="text-base font-bold font-akkuratLL mb-4">
                    Overview
                  </h3>
                  <Overview balanceInfo={accountBalance} />
                  <h3 className="mt-8 mb-4 text-black text-base font-bold font-akkuratLL">
                    Account Info
                  </h3>
                  <AccountInfo account={account as AccountWithAuthenticator} />
                </div>
                {/* Right Tiles */}
                <div className="flex flex-col flex-1"></div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
