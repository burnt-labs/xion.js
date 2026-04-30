import "@/setup/crypto";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AbstraxionProvider } from "@burnt-labs/abstraxion-react-native";

const config = {
  chainId: process.env.EXPO_PUBLIC_CHAIN_ID ?? "xion-testnet-2",
  rpcUrl:
    process.env.EXPO_PUBLIC_RPC_URL ?? "https://rpc.xion-testnet-2.burnt.com",
  restUrl:
    process.env.EXPO_PUBLIC_REST_URL ?? "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.EXPO_PUBLIC_GAS_PRICE ?? "0.001uxion",
  treasury: process.env.EXPO_PUBLIC_TREASURY_ADDRESS,
};

export default function RootLayout(): JSX.Element {
  return (
    <SafeAreaProvider>
      <AbstraxionProvider config={config}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" />
      </AbstraxionProvider>
    </SafeAreaProvider>
  );
}
