"use client";
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationContainer from "./NotificationContainer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        {children}
        <NotificationContainer />
      </NotificationProvider>
    </SessionProvider>
  );
}
