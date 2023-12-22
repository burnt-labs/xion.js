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
          className="flex items-center px-4 mb-3 h-16 bg-neutral-50 rounded-lg"
        >
          <div className="flex w-10 h-10 bg-black items-center justify-center rounded-full">
            <ScanIcon color="white" />
          </div>
          <div className="ml-4 flex flex-1 items-center justify-between">
            <p className="text-black text-base font-normal font-akkuratLL leading-normal">
              {String(authenticator.type).toUpperCase()}
            </p>
          </div>
        </div>
      );
    });
  };
  return (
    <div className="border border-black/20 p-6">
      <h3 className="text-black text-sm font-bold font-akkuratLL leading-none mb-6">
        XION Address
      </h3>
      <div
        onClick={copyXionAddress}
        className="flex cursor-pointer items-center justify-between mb-10 px-4 w-full h-16 bg-neutral-50 rounded-lg"
      >
        <p className="text-stone-500 text-base font-normal font-akkuratLL leading-normal">
          {truncateAddress(account?.bech32Address)}
        </p>
        <CopyIcon color="black" />
      </div>
      <div className="flex">
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-black text-sm font-bold font-akkuratLL leading-none">
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
