import { Dispatch, SetStateAction, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@burnt-labs/ui";
import { CopyIcon, ScanIcon } from "@/components/Icons";
import type { AbstraxionAccount } from "@/hooks";
import { truncateAddress } from "@/utils";

const AddAuthenticatorsModal = dynamic<{
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}>(
  () =>
    import("@/components/ModalViews/AddAuthenticators/AddAuthenticatorsModal"),
  {
    ssr: false,
    loading: () => (
      <Button className="!ui-p-0" structure="naked">
        Add more
      </Button>
    ),
  },
);

export const AccountInfo = ({ account }: { account?: AbstraxionAccount }) => {
  const [isOpen, setIsOpen] = useState(false);

  const copyXionAddress = () => {
    if (account?.id) {
      navigator.clipboard.writeText(account?.id);
    }
  };

  const renderAuthenticators = () => {
    return account?.authenticators?.nodes.map((authenticator) => {
      return (
        <div
          key={authenticator.id}
          className="ui-flex ui-items-center ui-px-4 ui-mb-3 ui-h-16 ui-bg-black ui-rounded-lg"
        >
          <div className="ui-flex ui-w-10 ui-h-10 ui-bg-white/20 ui-items-center ui-justify-center ui-rounded-full">
            <ScanIcon color="white" />
          </div>
          <div className="ui-ml-4 ui-flex ui-flex-1 ui-items-center ui-justify-between">
            <p className="ui-text-white ui-text-base ui-font-normal ui-font-akkuratLL ui-leading-normal">
              {String(authenticator.type).toUpperCase()}
            </p>
          </div>
        </div>
      );
    });
  };
  return (
    <div className="ui-bg-white/10 ui-p-6 ui-rounded-2xl">
      <h3 className="ui-text-white ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none ui-mb-6">
        XION Address
      </h3>
      <div
        onClick={copyXionAddress}
        className="ui-flex ui-cursor-pointer ui-items-center ui-justify-between ui-mb-10 ui-px-4 ui-w-full ui-h-16 ui-bg-black ui-rounded-lg"
      >
        <p className="ui-text-white ui-text-base ui-font-normal ui-font-akkuratLL ui-leading-normal">
          {truncateAddress(account?.id)}
        </p>
        <CopyIcon color="white" />
      </div>
      <div className="ui-flex">
        <div className="ui-flex ui-flex-1 ui-flex-col">
          <div className="ui-flex ui-items-center ui-justify-between ui-mb-6">
            <h3 className="ui-text-white ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none">
              Your Logins
            </h3>
            <Button
              className="!ui-p-0"
              onClick={() => setIsOpen(true)}
              structure="naked"
            >
              Add more
            </Button>
            <AddAuthenticatorsModal isOpen={isOpen} setIsOpen={setIsOpen} />
          </div>
          {renderAuthenticators()}
        </div>
        {/* TODO: Add history components */}
        {/* <div className="flex flex-1 flex-col"></div> */}
      </div>
    </div>
  );
};
