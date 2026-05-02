import "@/setup/crypto";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Each route has its own AbstraxionProvider so we can demonstrate redirect
 * mode (`/`) and embedded WebView mode (`/embedded`) side-by-side without one
 * provider's auth mode leaking into the other.
 */
export default function RootLayout(): JSX.Element {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#000" },
          headerTintColor: "#fff",
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "XION · Redirect" }}
        />
        <Stack.Screen
          name="embedded"
          options={{ title: "XION · Embedded" }}
        />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
