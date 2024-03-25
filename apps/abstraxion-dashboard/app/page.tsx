"use client";
import { useContext } from "react";
import { useSearchParams } from "next/navigation";
import { AccountInfo } from "@/components/AccountInfo";
import { AbstraxionContext } from "@/components/AbstraxionContext";
import { Overview } from "@/components/Overview";
import { Sidebar } from "@/components/Sidebar";
import { Abstraxion } from "@/components/Abstraxion";
import { AbstraxionAccount, useAbstraxionAccount } from "../hooks";

export default function Home() {
  const searchParams = useSearchParams();
  const { data: account } = useAbstraxionAccount();

  const contracts = searchParams.get("contracts");
  const stake = Boolean(searchParams.get("stake"));
  const bank = searchParams.get("bank");
  const grantee = searchParams.get("grantee");
  const { isOpen, setIsOpen } = useContext(AbstraxionContext);

  return (
    <>
      {!account?.id || (grantee && (contracts || stake || bank)) ? (
        <div className="ui-flex ui-h-screen ui-flex-1 ui-items-center ui-justify-center ui-overflow-y-auto ui-p-6">
          <Abstraxion onClose={() => null} isOpen={true} />
        </div>
      ) : (
        <>
          <Sidebar />
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
                <div className="ui-flex ui-flex-1 ui-flex-col"></div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
