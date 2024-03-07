"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useContext } from "react";
import { AbstraxionContext, AbstraxionContextProps } from "./AbstraxionContext";

const NAV_OPTIONS = [{ text: "home", path: "/" }];

export function Sidebar() {
  const pathname = usePathname();
  const { isMainnet } = useContext(AbstraxionContext) as AbstraxionContextProps;

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
    <div className="ui-h-screen ui-bg-primary ui-text-white ui-flex ui-flex-col ui-w-64">
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
