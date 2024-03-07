"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useContext } from "react";
import { AbstraxionContext, AbstraxionContextProps } from "./AbstraxionContext";
import { ChevronDownIcon, WalletIcon } from "./Icons";

const NAV_OPTIONS = [{ text: "home", path: "/" }];

export function Sidebar() {
  const pathname = usePathname();
  const { isMainnet, setIsOpen } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const renderNavOptions = () => {
    return NAV_OPTIONS.map((option) => {
      if (option.text === "home") {
        return (
          <div
            key={option.text}
            className="ui-flex ui-w-full ui-justify-between ui-px-8"
          >
            <Link
              href={option.path}
              className={`${
                pathname === option.path ? "ui-text-white" : "ui-text-slate-400"
              } ui-font-akkuratLL ui-block ui-mt-8 first:ui-mt-0 ui-leading-3 ui-uppercase ui-tracking-widest ui-text-4xl ui-font-thin`}
            >
              {option.text}
            </Link>
            <div
              className={`ui-h-2.5 ui-w-2.5 ${
                isMainnet ? "ui-bg-mainnet" : "ui-bg-testnet"
              } ui-rounded-full`}
            ></div>
          </div>
        );
      }
      return (
        <Link
          key={option.text}
          href={option.path}
          className={`${
            pathname === option.path ? "ui-text-white" : "ui-text-slate-400"
          } ui-font-akkuratLL ui-block ui-px-8 ui-mt-8 first:ui-mt-0 ui-leading-3 ui-uppercase ui-tracking-widest ui-text-4xl ui-font-thin`}
        >
          {option.text}
        </Link>
      );
    });
  };

  return (
    <div className="ui-h-screen ui-bg-primary ui-border-[#6C6A6A] ui-border-r-[1px] ui-text-white ui-flex ui-flex-col ui-w-64">
      <div className="ui-flex ui-items-center ui-justify-between ui-px-8 ui-pt-8">
        <Image src="/logo.png" alt="Xion Logo" width="90" height="32" />
        <div
          className={`ui-flex ${
            isMainnet ? "ui-bg-mainnet-bg" : "ui-bg-testnet-bg"
          } ui-px-2 ui-py-1 ui-ml-6 ${
            isMainnet ? "ui-text-mainnet" : "ui-text-testnet"
          } ui-rounded-md ui-font-akkuratLL ui-text-xs ui-tracking-widest`}
        >
          {isMainnet ? "MAINNET" : "TESTNET"}
        </div>
      </div>

      <div className="ui-flex ui-justify-center ui-flex-col ui-flex-grow ">
        {renderNavOptions()}
        <a
          href={"https://explorer.burnt.com/xion-testnet-1/"}
          target="_blank"
          className={`${"ui-text-slate-400 ui-font-regular"} ui-font-akkuratLL ui-block ui-px-8 ui-mt-16 first:ui-mt-0 ui-font-thin ui-leading-3 ui-text-4xl ui-uppercase ui-tracking-widest`}
        >
          History
        </a>
      </div>
      <div className="ui-flex ui-justify-between ui-px-4 ui-h-12 ui-w-full ui-items-center ui-rounded ui-bg-black ui-mx-auto ui-my-0">
        <div className="ui-flex ui-items-center">
          <div className="ui-flex ui-mr-1 ui-h-8 ui-w-8 ui-items-center ui-justify-center ui-rounded-full ui-bg-black">
            <WalletIcon color="white" backgroundColor="black" />
          </div>
          <p className="ui-font-akkuratLL ui-text-white ui-font-medium">
            Personal Account
          </p>
        </div>

        <div
          onClick={() => setIsOpen(true)}
          className="ui-flex ui-items-center ui-ml-2 ui-justify-center ui-border-white/40 ui-border-[1px] ui-rounded-full ui-h-8 ui-w-8 ui-cursor-pointer"
        >
          <div className="ui-flex ui-flex-col">
            <div className="ui-h-1 ui-w-1 ui-bg-white/40 ui-rounded-full ui-mb-0.5" />
            <div className="ui-h-1 ui-w-1 ui-bg-white/40 ui-rounded-full ui-mb-0.5" />
            <div className="ui-h-1 ui-w-1 ui-bg-white/40 ui-rounded-full" />
          </div>
        </div>
      </div>
      {/* TODO: Display User Info */}
      {/* <div className="p-8">
        <div className="flex items-center">
          <p className="text-base font-normal">User@burnt.com</p>
          <button type="button"></button>
        </div>
      </div> */}
    </div>
  );
}
