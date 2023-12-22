interface OverviewProps {
  balanceInfo: BalanceInfo | null;
}

const XION_TO_USDC_CONVERSION = 50;

export const Overview = ({ balanceInfo }: OverviewProps) => {
  const xionBalance = balanceInfo?.balances.find(
    (balance) => balance.denom === "xion"
  );

  return (
    <div className="w-full bg-gradient-to-l from-slate-300 via-slate-400 to-slate-400 rounded-2xl p-6">
      <div className="flex mb-6 items-center">
        <h1 className="font-akkuratLL text-white text-2xl font-bold leading-7 mr-6">
          Personal Account
        </h1>
        {/* <ScanIcon color="white" /> */}
      </div>
      <h3 className="font-akkuratLL text-white text-opacity-50 text-sm font-bold">
        Current Balance
      </h3>
      <div className="flex justify-between items-center">
        {balanceInfo && (
          <h1 className="font-akkuratLL text-4xl font-bold leading-wide text-white">
            ${balanceInfo?.total}
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
      <div className="my-6 w-full h-[1px] bg-white bg-opacity-20"></div>
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
        <div className="flex justify-between items-center">
          <p className="text-white text-base font-normal font-akkuratLL leading-normal">
            XION
          </p>
          <div className="flex">
            <p className="text-white text-base font-normal font-akkuratLL leading-normal">
              {xionBalance.amount} XION
            </p>
            <p className="ml-6 text-right text-white text-opacity-70 text-base font-normal font-akkuratLL leading-normal">
              ${Number(xionBalance.amount) * XION_TO_USDC_CONVERSION} USDC
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
