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
              ? "text-white font-bold"
              : "text-slate-400 font-regular"
          } font-akkuratLL block pl-8 mt-8 first:mt-0 text-xs leading-3 uppercase tracking-widest`}
        >
          {option.text}
        </Link>
      );
    });
  };

  return (
    <div className="h-screen bg-primary text-white flex flex-col w-64">
      <div className="flex items-center justify-start pl-8 pt-8">
        <Image src="/logo.png" alt="Xion Logo" width="90" height="32" />
      </div>

      <div className="flex-grow mt-14">
        {renderNavOptions()}
        <a
          href={"https://explorer.burnt.com/xion-testnet-1/"}
          target="_blank"
          className={`${"text-slate-400 font-regular"} font-akkuratLL block pl-8 mt-8 first:mt-0 text-xs leading-3 uppercase tracking-widest`}
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
