import { ReactNode, createContext, useState } from "react";
import { getEnvStringOrThrow } from "@/utils";

export interface DashboardContextProps {
  isMainnet: boolean;
}

export const DashboardContext = createContext<DashboardContextProps>(
  {} as DashboardContextProps,
);

export const AbstraxionContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isMainnet =
    getEnvStringOrThrow(
      "NEXT_PUBLIC_DEPLOYMENT_ENV",
      process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
    ) === "mainnet"
      ? true
      : false;

  return (
    <DashboardContext.Provider
      value={{
        isMainnet,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
