/**
 * React Native equivalent of `<AbstraxionEmbed>` from `@burnt-labs/abstraxion-react`.
 *
 * Renders the dashboard inside a `react-native-webview` `WebView`, bridges
 * messages to/from native via `RNWebViewIframeTransport`, and exposes the
 * same `idleView` / `connectedView` / `approvalView` props as the web embed.
 *
 * `react-native-webview` is an optional peer dependency — we lazy-require it
 * inside the component so users on `redirect`/`signer` modes don't pay the
 * native module cost.
 */

import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import { IframeController } from "@burnt-labs/abstraxion-js";
import type { IframeTransportStrategy } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";
import {
  RNWebViewIframeTransport,
  type RNWebViewControl,
} from "../strategies/RNWebViewIframeTransport";

type InactiveView = "button" | "fullview" | "hidden";

export interface AbstraxionEmbedProps {
  idleView?: InactiveView;
  disconnectedView?: InactiveView;
  /** What to show when connected with no pending approval. Default: "hidden". */
  connectedView?: "hidden" | "visible";
  /** Approval display: in-app modal overlay (default) or inline. */
  approvalView?: "modal" | "inline";
  loginLabel?: ReactNode;
  /** Style for the WebView wrapper. Required when connectedView="visible". */
  style?: ViewStyle;
}

export interface AbstraxionEmbedHandle {
  /** Force a reload of the dashboard WebView (rarely needed). */
  reload(): void;
}

const collapsed: ViewStyle = {
  width: 0,
  height: 0,
  overflow: "hidden",
};

/**
 * Mounts the dashboard inside a WebView and wires it up to the active
 * `IframeController` via `RNWebViewIframeTransport`. Place once at the root of
 * your app — only one embed should be mounted at a time.
 */
export const AbstraxionEmbed = forwardRef<
  AbstraxionEmbedHandle,
  AbstraxionEmbedProps
>(function AbstraxionEmbed(
  {
    idleView = "button",
    disconnectedView,
    connectedView = "hidden",
    approvalView = "modal",
    loginLabel = "Sign in with XION",
    style,
  },
  forwardedRef,
) {
  const inactiveView = disconnectedView ?? idleView;

  const {
    controller,
    isConnected,
    isConnecting,
    isDisconnected,
    abstraxionError,
    login,
  } = useContext(AbstraxionContext) as unknown as {
    controller?: import("@burnt-labs/abstraxion-js").Controller;
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    abstraxionError: string;
    login: () => Promise<void>;
  };

  // Lazily require react-native-webview so consumers that don't use embedded
  // mode aren't forced to install it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebViewRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebViewModule = useMemo<any>(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("react-native-webview");
    } catch {
      return null;
    }
  }, []);

  const transport = useMemo(() => {
    if (!(controller instanceof IframeController)) return null;
    const strategy = controller.getTransportStrategy();
    return strategy instanceof RNWebViewIframeTransport ? strategy : null;
  }, [controller]);

  // Track approval-pending state for modal display.
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  useEffect(() => {
    if (!(controller instanceof IframeController)) return;
    return controller.subscribeApproval(setIsAwaitingApproval);
  }, [controller]);

  // Track WebView load + bridge ready.
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const containerRegisteredRef = useRef(false);

  useEffect(() => {
    if (!transport || containerRegisteredRef.current) return;
    if (!(controller instanceof IframeController)) return;

    const control: RNWebViewControl = {
      injectJavaScript: (script: string) => {
        WebViewRef.current?.injectJavaScript?.(script);
      },
      loadUrl: (url: string) => {
        // Schedule a render so the WebView's `source` prop updates.
        setPendingUrl(url);
      },
      setVisible: () => {
        // Visibility is owned by this component (modal/collapsed/inline) — the
        // transport's setVisible() is informational.
      },
      unmount: () => {
        setPendingUrl(null);
      },
    };
    controller.setContainerElement(control as unknown as HTMLElement);
    containerRegisteredRef.current = true;
  }, [controller, transport]);

  // Auto-login when configured for fullview.
  useEffect(() => {
    if (!controller) return;
    const isFullview = inactiveView === "fullview";
    const shouldAutoLogin =
      (!isConnected &&
        !isConnecting &&
        !isDisconnected &&
        !abstraxionError &&
        idleView === "fullview") ||
      (isDisconnected && !abstraxionError && (disconnectedView ?? idleView) === "fullview") ||
      (!!abstraxionError && isFullview);
    if (shouldAutoLogin) {
      login().catch(() => undefined);
    }
  }, [
    controller,
    isConnected,
    isConnecting,
    isDisconnected,
    abstraxionError,
    idleView,
    disconnectedView,
    inactiveView,
    login,
  ]);

  useImperativeHandle(forwardedRef, () => ({
    reload: () => {
      WebViewRef.current?.reload?.();
    },
  }));

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      transport?.handleWebViewMessage(event.nativeEvent.data);
    },
    [transport],
  );

  const handleLogin = useCallback(() => {
    login().catch(() => undefined);
  }, [login]);

  if (!(controller instanceof IframeController)) {
    return null;
  }
  if (!WebViewModule) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>
          react-native-webview is required for embedded mode. Install it as a peer dep.
        </Text>
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebView = WebViewModule.WebView as any;
  const isInactive = !isConnected && !isConnecting;
  const showButton =
    (isInactive && inactiveView === "button") ||
    (!!abstraxionError && inactiveView !== "fullview");
  const collapse =
    (isConnected && !isAwaitingApproval && connectedView === "hidden") ||
    (isInactive && inactiveView !== "fullview") ||
    (!!abstraxionError && inactiveView !== "fullview");

  const showAsModal =
    isConnected && isAwaitingApproval && approvalView === "modal";

  const webViewElement =
    pendingUrl && WebView ? (
      <WebView
        ref={WebViewRef}
        source={{ uri: pendingUrl }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        style={styles.webView}
      />
    ) : null;

  return (
    <>
      {showButton && (
        <Pressable onPress={handleLogin} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>{loginLabel}</Text>
        </Pressable>
      )}

      {showAsModal ? (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => controller.cancelApproval()}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => controller.cancelApproval()}
          >
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              {webViewElement}
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        <View style={collapse ? collapsed : style}>{webViewElement}</View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  webView: { flex: 1 },
  loginButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "90%",
    height: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
  },
  errorBox: {
    padding: 16,
    backgroundColor: "#fee",
  },
  errorText: {
    color: "#900",
  },
});
