import { AccountWithAuthenticator } from "@/app/page";
import { CopyIcon, ScanIcon } from "./Icons";
import { truncateAddress } from "@/utils";

export const AccountInfo = ({
  account,
}: {
  account?: AccountWithAuthenticator;
}) => {
  const copyXionAddress = () => {
    if (account?.bech32Address) {
      navigator.clipboard.writeText(account?.bech32Address);
    }
  };

  const renderAuthenticators = () => {
    return account?.authenticators.nodes.map((authenticator) => {
      return (
        <div
          key={authenticator.id}
          className="ui-flex ui-items-center ui-px-4 ui-mb-3 ui-h-16 ui-bg-neutral-50 ui-rounded-lg"
        >
          <div className="ui-flex ui-w-10 ui-h-10 ui-bg-black ui-items-center ui-justify-center ui-rounded-full">
            <ScanIcon color="white" />
          </div>
          <div className="ui-ml-4 ui-flex ui-flex-1 ui-items-center ui-justify-between">
            <p className="ui-text-black ui-text-base ui-font-normal ui-font-akkuratLL ui-leading-normal">
              {String(authenticator.type).toUpperCase()}
            </p>
          </div>
        </div>
      );
    });
  };
  return (
    <div className="ui-border ui-border-black/20 ui-p-6">
      <h3 className="ui-text-black ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none ui-mb-6">
        XION Address
      </h3>
      <div
        onClick={copyXionAddress}
        className="ui-flex ui-cursor-pointer ui-items-center ui-justify-between ui-mb-10 ui-px-4 ui-w-full ui-h-16 ui-bg-neutral-50 ui-rounded-lg"
      >
        <p className="ui-text-stone-500 ui-text-base ui-font-normal ui-font-akkuratLL ui-leading-normal">
          {truncateAddress(account?.bech32Address)}
        </p>
        <CopyIcon color="black" />
      </div>
      <div className="ui-flex">
        <div className="ui-flex ui-flex-1 ui-flex-col">
          <div className="ui-flex ui-items-center ui-justify-between ui-mb-6">
            <h3 className="ui-text-black ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none">
              Your Logins
            </h3>
            {/* TODO: Add ability to add authenticator */}
            {/* <button className="text-right text-black text-sm font-normal font-akkuratLL underline leading-tight">
              Add Member
            </button> */}
          </div>
          {renderAuthenticators()}
        </div>
        {/* TODO: Add history components */}
        {/* <div className="flex flex-1 flex-col"></div> */}
      </div>
    </div>
  );
};
