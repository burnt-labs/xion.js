"use client";

import React, { createContext, useContext, useRef, useCallback } from "react";
import { useMetamask, type UseMetamaskReturn } from "@/hooks/useMetamask";

// Context to provide MetaMask functionality and integration handlers
interface MetamaskAuthContextType {
  metamask: UseMetamaskReturn;
  registerAbstraxionLogin: (handler: () => Promise<void>) => void;
  registerAbstraxionLogout: (handler: () => void) => void;
}

const MetamaskAuthContext = createContext<MetamaskAuthContextType | null>(null);

export function useMetamaskAuth() {
  const context = useContext(MetamaskAuthContext);
  if (!context) {
    throw new Error("useMetamaskAuth must be used within MetamaskAuthProvider");
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const metamask = useMetamask();
  const abstraxionLoginRef = useRef<(() => Promise<void>) | null>(null);
  const abstraxionLogoutRef = useRef<(() => void) | null>(null);

  const registerAbstraxionLogin = useCallback(
    (handler: () => Promise<void>) => {
      abstraxionLoginRef.current = handler;
    },
    [],
  );

  const registerAbstraxionLogout = useCallback((handler: () => void) => {
    abstraxionLogoutRef.current = handler;
  }, []);

  // Auto-connect to Abstraxion when MetaMask is authenticated
  React.useEffect(() => {
    if (metamask.isReady && abstraxionLoginRef.current) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        abstraxionLoginRef.current?.();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [metamask.isReady]);

  return (
    <MetamaskAuthContext.Provider
      value={{
        metamask,
        registerAbstraxionLogin,
        registerAbstraxionLogout,
      }}
    >
      {children}
    </MetamaskAuthContext.Provider>
  );
}
