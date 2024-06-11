import { Abstraxion, useModal } from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import Image from "next/image";
import React from "react";

export function Landing() {
  const [showModal, setShowModal] = useModal();
  return (
    <div
      className="ui-flex ui-flex-col ui-w-screen ui-h-screen ui-bg-cover ui-bg-center"
      style={{ backgroundImage: `url('/landingBackground.png')` }}
    >
      <div className="ui-p-6">
        <Image src="/logo.png" alt="XION Logo" width="90" height="32" />
      </div>
      <div className="ui-flex ui-flex-col ui-flex-1 ui-justify-center ui-items-center">
        <h2 className="ui-text-2xl lg:ui-text-6xl ui-text-white ui-font-akkuratLL ui-font-thin">
          Introducing
        </h2>
        <h1 className="ui-text-4xl lg:ui-text-9xl ui-text-white ui-font-akkuratLL ui-font-black">
          ABSTRAXION
        </h1>
        <div className="ui-mt-8 ui-min-w-[150px] lg:ui-min-w-[300px]">
          <Button
            onClick={() => {
              setShowModal(true);
            }}
            fullWidth
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}
