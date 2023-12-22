"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AbstraxionProvider } from "@burnt-labs/abstraxion";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AbstraxionProvider>{children}</AbstraxionProvider>
    </QueryClientProvider>
  );
}
