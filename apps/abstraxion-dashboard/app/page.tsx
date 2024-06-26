"use client";
import { useContext, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccountInfo } from "@/components/AccountInfo";
import { AbstraxionContext } from "@/components/AbstraxionContext";
import { Overview } from "@/components/Overview";
import { Sidebar } from "@/components/Sidebar";
import { Abstraxion } from "@/components/Abstraxion";
import { useAbstraxionAccount } from "../hooks";
import Image from "next/image";
import type { AbstraxionAccount } from "@/types";

export default function Home() {
  const searchParams = useSearchParams();
  const { data: account } = useAbstraxionAccount();

  const contracts = searchParams.get("contracts");
  const stake = Boolean(searchParams.get("stake"));
  const bank = searchParams.get("bank");
  const grantee = searchParams.get("grantee");
  const { isOpen, setIsOpen, isMainnet } = useContext(AbstraxionContext);

  const [showMobileSiderbar, setShowMobileSiderbar] = useState(false);

  return (
    <>
      {!account?.id || (grantee && (contracts || stake || bank)) ? (
        <div className="ui-flex ui-h-screen ui-flex-1 ui-items-center ui-justify-center ui-overflow-y-auto ui-p-6">
          <Abstraxion onClose={() => null} isOpen={true} />
        </div>
      ) : (
        <div className="ui-flex ui-relative ui-h-screen">
          {showMobileSiderbar ? (
            <div className="ui-absolute ui-h-screen ui-w-screen ui-bg-black ui-bg-opacity-20 ui-backdrop-blur-md ui-z-50">
              <Sidebar onClose={() => setShowMobileSiderbar(false)} />
            </div>
          ) : null}
          <div className="ui-hidden sm:ui-flex">
            <Sidebar />
          </div>

          <div className="ui-flex ui-flex-1 ui-flex-col">
            <div className="ui-flex sm:!ui-hidden  ui-justify-between ui-items-center ui-bg-black ui-p-6 ui-border-b-[1px] ui-border-[#6C6A6A]">
              <div className="ui-flex ui-items-center">
                <Image src="/logo.png" alt="XION Logo" width="90" height="32" />
                <div
                  className={`ui-flex ${
                    isMainnet ? "ui-bg-mainnet-bg" : "ui-bg-testnet-bg"
                  } ui-px-2 ui-py-1 ui-ml-4 ${
                    isMainnet ? "ui-text-mainnet" : "ui-text-testnet"
                  } ui-rounded-md ui-font-akkuratLL ui-text-xs ui-tracking-widest`}
                >
                  {isMainnet ? "MAINNET" : "TESTNET"}
                </div>
              </div>
              <div onClick={() => setShowMobileSiderbar(true)}>
                <div className="ui-bg-white ui-w-8 ui-h-[1px] ui-mb-2" />
                <div className="ui-bg-white ui-w-6 ui-h-[1px] ui-ml-auto" />
              </div>
            </div>
            <div className="ui-h-screen ui-bg-black ui-flex-1 ui-overflow-y-auto ui-p-6">
              <div className="ui-relative">
                <Abstraxion onClose={() => setIsOpen(false)} isOpen={isOpen} />
                {/* Tiles */}
                <div className="ui-mx-auto ui-flex ui-max-w-7xl">
                  {/* Left Tiles */}
                  <div className="ui-flex-grow-2 ui-flex ui-flex-col">
                    <h3 className="ui-font-akkuratLL ui-mb-4 ui-text-2xl ui-text-white ui-font-bold">
                      Overview
                    </h3>
                    <Overview account={account as AbstraxionAccount} />
                    <h3 className="ui-font-akkuratLL ui-mb-4 ui-mt-8 ui-text-2xl ui-font-bold ui-text-white">
                      Account Info
                    </h3>
                    <AccountInfo account={account as AbstraxionAccount} />
                  </div>
                  {/* Right Tiles */}
                  <div className="ui-hidden sm:ui-flex sm:ui-flex-1 sm:ui-flex-col"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
