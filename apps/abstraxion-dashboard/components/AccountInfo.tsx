import { Popover, PopoverTrigger, PopoverContent } from "@burnt-labs/ui";
import { CopyIcon } from "@/components/Icons";
import { truncateAddress } from "@/utils";
import { AbstraxionAccount } from "@burnt-labs/abstraxion";

export const AccountInfo = ({ account }: { account?: AbstraxionAccount }) => {
  const copyXIONAddress = () => {
    if (account?.bech32Address) {
      navigator.clipboard.writeText(account?.bech32Address);
    }
  };

  return (
    <div className="ui-bg-white/10 ui-p-6 ui-rounded-2xl">
      <h3 className="ui-text-white ui-text-sm ui-font-bold ui-font-akkuratLL ui-leading-none ui-mb-6">
        XION Address
      </h3>
      <div
        onClick={copyXIONAddress}
        className="ui-flex ui-cursor-pointer ui-items-center ui-justify-between ui-px-4 ui-w-full ui-h-16 ui-bg-black ui-rounded-lg"
      >
        <p className="ui-text-white ui-text-base ui-font-normal ui-font-akkuratLL ui-leading-normal">
          {truncateAddress(account?.bech32Address)}
        </p>
        <Popover>
          <PopoverTrigger>
            <CopyIcon color="white" />
          </PopoverTrigger>
          <PopoverContent>
            <p>Copied!</p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
