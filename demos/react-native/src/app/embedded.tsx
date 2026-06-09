/**
 * Embedded-mode demo.
 *
 * Mounts the dashboard inside an in-app `<WebView>` via the
 * `<AbstraxionEmbed>` component. Login, grant approval, and manage-authenticators
 * happen entirely inside the WebView — no Expo WebBrowser session, no deep
 * link round-trip.
 *
 * Requires `react-native-webview` to be installed at the consumer level.
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import {
  AbstraxionEmbed,
  AbstraxionProvider,
  useAbstraxionAccount,
  useManageAuthenticators,
} from "@burnt-labs/abstraxion-react-native";

const config = {
  chainId: process.env.EXPO_PUBLIC_CHAIN_ID ?? "xion-testnet-2",
  rpcUrl:
    process.env.EXPO_PUBLIC_RPC_URL ?? "https://rpc.xion-testnet-2.burnt.com",
  restUrl:
    process.env.EXPO_PUBLIC_REST_URL ?? "https://api.xion-testnet-2.burnt.com",
  gasPrice: process.env.EXPO_PUBLIC_GAS_PRICE ?? "0.001uxion",
  treasury: process.env.EXPO_PUBLIC_TREASURY_ADDRESS,
  authentication: { type: "embedded" as const },
};

export default function EmbeddedRoute(): JSX.Element {
  return (
    <AbstraxionProvider config={config}>
      <EmbeddedScreen />
    </AbstraxionProvider>
  );
}

function EmbeddedScreen(): JSX.Element {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isConnecting,
    isInitializing,
  } = useAbstraxionAccount();
  const { manageAuthenticators, isSupported } = useManageAuthenticators();
  const [manageStatus, setManageStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");

  const handleManage = async () => {
    setManageStatus("pending");
    try {
      await manageAuthenticators();
      setManageStatus("success");
    } catch {
      setManageStatus("error");
    }
  };

  const showSignIn = !isInitializing && !isConnected;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Embedded WebView</Text>
        <Text style={styles.subtitle}>
          The dashboard runs inside this app via react-native-webview.
        </Text>

        <Link href="/" asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkText}>← Back to redirect mode</Text>
          </Pressable>
        </Link>

        {isInitializing && (
          <View style={styles.row}>
            <ActivityIndicator size="small" color="#fbbf24" />
            <Text style={styles.muted}>Restoring session…</Text>
          </View>
        )}

        {showSignIn && (
          <View style={styles.signInWrapper}>
            <Pressable
              onPress={() => login().catch(() => undefined)}
              disabled={isConnecting}
              style={styles.signInButton}
            >
              <Text style={styles.signInButtonText}>
                {isConnecting ? "Opening…" : "Sign in with XION"}
              </Text>
            </Pressable>
          </View>
        )}

        {isConnected && account.bech32Address && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Connected as</Text>
            <Text style={styles.address} selectable>
              {account.bech32Address}
            </Text>
            {isSupported && (
              <Pressable onPress={handleManage} style={styles.outlinedButton}>
                <Text style={styles.outlinedButtonText}>
                  {manageStatus === "pending"
                    ? "OPENING…"
                    : "MANAGE AUTHENTICATORS"}
                </Text>
              </Pressable>
            )}
            {manageStatus === "success" && (
              <Text style={styles.success}>Authenticators updated.</Text>
            )}
            <Pressable onPress={() => logout()} style={styles.outlinedButton}>
              <Text style={[styles.outlinedButtonText, styles.disconnect]}>
                DISCONNECT
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Embed handles the WebView + approval modal only. Idle button is
          rendered in-flow above so it sits with the rest of the content. */}
      <AbstraxionEmbed
        idleView="hidden"
        connectedView="hidden"
        approvalView="modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 24, gap: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9ca3af", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  muted: { color: "#9ca3af", fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  cardLabel: { color: "#9ca3af", fontSize: 12 },
  address: { color: "#4ade80", fontSize: 13, fontFamily: "Courier" },
  outlinedButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlinedButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  disconnect: { color: "#f87171" },
  success: { color: "#4ade80", fontSize: 12 },
  linkRow: { paddingVertical: 6 },
  linkText: { color: "#60a5fa", fontSize: 13 },
  signInWrapper: {
    marginTop: 24,
    alignItems: "center",
  },
  signInButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  signInButtonText: {
    color: "#000",
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 13,
  },
});
