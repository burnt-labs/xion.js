"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV_OPTIONS = [
  { text: "home", path: "/" },
  // { text: "history", path: "/history" },
  // TODO: Implement Settings Page
  // { text: "settings", path: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderNavOptions = () => {
    return NAV_OPTIONS.map((option) => {
      return (
        <Link
          key={option.text}
          href={option.path}
          className={`${
            pathname === option.path
              ? "ui-text-white ui-font-bold"
              : "ui-text-slate-400 ui-font-regular"
          } ui-font-akkuratLL ui-block ui-pl-8 ui-mt-8 first:ui-mt-0 ui-text-xs ui-leading-3 ui-uppercase ui-tracking-widest`}
        >
          {option.text}
        </Link>
      );
    });
  };

  return (
    <div className="ui-h-screen ui-bg-primary ui-text-white ui-flex ui-flex-col ui-w-64">
      <div className="ui-flex ui-items-center ui-justify-start ui-pl-8 ui-pt-8">
        <Image src="/logo.png" alt="Xion Logo" width="90" height="32" />
      </div>

      <div className="ui-flex-grow ui-mt-14">
        {renderNavOptions()}
        <a
          href={"https://explorer.burnt.com/xion-testnet-1/"}
          target="_blank"
          className={`${"ui-text-slate-400 ui-font-regular"} ui-font-akkuratLL ui-block ui-pl-8 ui-mt-8 first:ui-mt-0 ui-text-xs ui-leading-3 ui-uppercase ui-tracking-widest`}
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
