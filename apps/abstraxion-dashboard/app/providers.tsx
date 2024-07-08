"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";
import { DashboardProvider } from "../components/Abstraxion";

const queryClient = new QueryClient();

// Example XION seat contract
const seatContractAddress =
  "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AbstraxionProvider
        config={{
          contracts: [
            // Usually, you would have a list of different contracts here
            seatContractAddress,
            {
              address: seatContractAddress,
              amounts: [{ denom: "uxion", amount: "1000000" }],
            },
          ],
          stake: true,
          bank: [
            {
              denom: "uxion",
              amount: "1000000",
            },
          ],
        }}
      >
        <DashboardProvider>{children}</DashboardProvider>
      </AbstraxionProvider>
    </QueryClientProvider>
  );
}
