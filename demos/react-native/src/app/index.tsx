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
};

export default function HomeRoute(): JSX.Element {
  return (
    <AbstraxionProvider config={config}>
      <HomeScreen />
    </AbstraxionProvider>
  );
}

type ManageStatus = "idle" | "pending" | "success" | "cancelled" | "error";

/**
 * Minimal RN auth flow:
 *   - Disconnected: Connect button (opens Expo WebBrowser to the dashboard).
 *   - Connected: account address + "Manage Authenticators" + logout.
 *
 * Redirect is the only RN-supported dashboard mode today. Manage-authenticators
 * piggy-backs on the same redirect flow via Expo WebBrowser.
 */
function HomeScreen(): JSX.Element {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isConnecting,
    isInitializing,
  } = useAbstraxionAccount();

  const {
    manageAuthenticators,
    isSupported: isManageAuthSupported,
    unsupportedReason: manageAuthUnsupportedReason,
  } = useManageAuthenticators();

  const [loginError, setLoginError] = useState<string | null>(null);
  const [manageStatus, setManageStatus] = useState<ManageStatus>("idle");
  const [manageError, setManageError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await login();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleManage = async () => {
    setManageStatus("pending");
    setManageError(null);
    try {
      await manageAuthenticators();
      setManageStatus("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCancelled = /cancelled|closed/i.test(msg);
      setManageStatus(isCancelled ? "cancelled" : "error");
      if (!isCancelled) setManageError(msg);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      <Text style={styles.title}>ABSTRAXION</Text>
      <Text style={styles.subtitle}>React Native demo · Redirect mode</Text>

      <Link href="/embedded" asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.linkText}>Try embedded WebView mode →</Text>
        </Pressable>
      </Link>

      {isInitializing && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#fbbf24" />
          <Text style={styles.muted}>Checking session…</Text>
        </View>
      )}

      {!isConnected && !isInitializing && (
        <>
          <Pressable
            onPress={handleLogin}
            disabled={isConnecting}
            style={({ pressed }) => [
              styles.button,
              isConnecting && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {isConnecting ? "OPENING DASHBOARD…" : "CONNECT WALLET"}
            </Text>
          </Pressable>
          {loginError && (
            <View style={[styles.banner, styles.bannerError]}>
              <Text style={styles.bannerText}>{loginError}</Text>
            </View>
          )}
        </>
      )}

      {isConnected && account.bech32Address && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Connected as</Text>
            <Text style={styles.address} selectable>
              {account.bech32Address}
            </Text>
          </View>

          {isManageAuthSupported ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Manage Your Account</Text>
              <Text style={styles.cardBody}>
                Add or remove ways to sign in (passkey, social, wallet) via the
                dashboard. Opens in the same Expo WebBrowser session as login.
              </Text>
              <Pressable
                onPress={handleManage}
                disabled={manageStatus === "pending"}
                style={({ pressed }) => [
                  styles.outlinedButton,
                  manageStatus === "pending" && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.outlinedButtonText}>
                  {manageStatus === "pending"
                    ? "OPENING DASHBOARD…"
                    : "MANAGE AUTHENTICATORS ↗"}
                </Text>
              </Pressable>
              {manageStatus === "success" && (
                <Text style={styles.success}>Authenticators updated.</Text>
              )}
              {manageStatus === "cancelled" && (
                <Text style={styles.warning}>Cancelled.</Text>
              )}
              {manageStatus === "error" && manageError && (
                <Text style={styles.error}>{manageError}</Text>
              )}
            </View>
          ) : (
            <View style={[styles.card, styles.cardMuted]}>
              <Text style={styles.cardTitle}>Manage Your Account</Text>
              <Text style={styles.muted}>
                {manageAuthUnsupportedReason ??
                  "Not supported in this auth mode."}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => logout()}
            style={({ pressed }) => [
              styles.outlinedButton,
              styles.disconnectButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.outlinedButtonText, styles.disconnectText]}>
              DISCONNECT
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: "#000",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(17,24,39,0.5)",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  cardMuted: {
    backgroundColor: "rgba(17,24,39,0.3)",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cardLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
  cardBody: {
    color: "#9ca3af",
    fontSize: 12,
  },
  address: {
    color: "#4ade80",
    fontFamily: "Courier",
    fontSize: 13,
  },
  button: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  outlinedButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  outlinedButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  disconnectButton: {
    borderColor: "rgba(239,68,68,0.4)",
  },
  disconnectText: {
    color: "#f87171",
  },
  banner: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  bannerError: {
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  bannerText: {
    color: "#fca5a5",
    fontSize: 12,
  },
  muted: {
    color: "#6b7280",
    fontSize: 12,
  },
  success: {
    color: "#4ade80",
    fontSize: 12,
  },
  warning: {
    color: "#fbbf24",
    fontSize: 12,
  },
  error: {
    color: "#f87171",
    fontSize: 12,
  },
  linkRow: {
    paddingVertical: 6,
  },
  linkText: {
    color: "#60a5fa",
    fontSize: 13,
  },
});
