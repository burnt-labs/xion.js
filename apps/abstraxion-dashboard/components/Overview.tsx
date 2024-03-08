import { formatBalance, getCommaSeperatedNumber } from "@/utils";

interface OverviewProps {
  balanceInfo: BalanceInfo | null;
}

const XION_TO_USDC_CONVERSION = 50;

export const Overview = ({ balanceInfo }: OverviewProps) => {
  const xionBalance = balanceInfo?.balances.find(
    (balance) => balance.denom === "xion",
  );

  return (
    <div
      style={{
        backgroundImage: `url('/overviewBackground.png')`,
      }}
      className="ui-w-full ui-bg-cover ui-bg-no-repeat ui-bg-center ui-rounded-2xl ui-p-6 bg-fixed"
    >
      <div className="ui-mb-6 ui-flex ui-items-center">
        <h1 className="ui-font-akkuratLL ui-mr-6 ui-text-2xl ui-font-bold ui-leading-7 ui-text-white">
          Personal Account
        </h1>
        {/* <ScanIcon color="white" /> */}
      </div>
      <h3 className="ui-font-akkuratLL ui-text-sm ui-text-white/50 ui-mb-2">
        Current Balance
      </h3>
      <div className="ui-flex ui-items-center ui-justify-between">
        {balanceInfo && (
          <h1 className="ui-font-akkuratLL ui-leading-wide ui-text-4xl ui-font-bold ui-text-white">
            ${/* TODO: Change once we support multiple currencies */}
            {formatBalance(
              Number(xionBalance?.amount) * XION_TO_USDC_CONVERSION,
            )}
          </h1>
        )}
        {/* Hidden until functionality is in place. */}
        {/* <div className="flex">
          <div className="w-12 h-12 bg-black rounded-full flex justify-center items-center mr-6">
            <ScanIcon color="white" />
          </div>
          <div className="w-12 h-12 bg-black rounded-full flex justify-center items-center">
            <RightArrowIcon color="white" />
          </div>
        </div> */}
      </div>
      {/* Divider */}
      <div className="ui-my-6 ui-h-[1px] ui-w-full ui-bg-white/20"></div>
      {/* Wait for USDC */}
      {/* <div className="flex justify-between items-center mb-3">
        <p className="text-white text-base font-normal font-akkuratLL leading-normal">
          USDC
        </p>
        <div className="flex">
          <p className="text-white text-base font-normal font-akkuratLL leading-normal">
            190 USDC
          </p>
          <p className="ml-6 text-right text-white text-opacity-70 text-base font-normal font-akkuratLL leading-normal">
            $190 USDC
          </p>
        </div>
      </div> */}
      {xionBalance && (
        <div className="ui-flex ui-items-center ui-justify-between">
          <p className="ui-font-akkuratLL ui-text-base ui-font-normal ui-leading-normal ui-text-white">
            XION
          </p>
          <div className="ui-flex">
            <p className="ui-font-akkuratLL ui-text-base ui-font-normal ui-leading-normal ui-text-white">
              {getCommaSeperatedNumber(Number(xionBalance.amount))} XION
            </p>
            <p className="ui-font-akkuratLL ui-ml-6 ui-text-right ui-text-base ui-font-normal ui-leading-normal ui-text-white/70">
              $
              {formatBalance(
                Number(xionBalance.amount) * XION_TO_USDC_CONVERSION,
              )}{" "}
              USD
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
