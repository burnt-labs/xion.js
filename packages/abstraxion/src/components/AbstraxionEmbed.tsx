"use client";

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AbstraxionContext } from "../AbstraxionProvider";
import { IframeController } from "../controllers/IframeController";

/** View option for states where the user is not connected. */
type InactiveView = "button" | "fullview" | "hidden";

export interface AbstraxionEmbedProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * What to show when the user hasn't logged in yet (idle / initializing).
   * - `"button"` — render a login button that starts the auth flow on click
   * - `"fullview"` — show the full login/auth view immediately
   * - `"hidden"` — render nothing visible (call `login()` manually via hook)
   * @default "button"
   */
  idleView?: InactiveView;

  /**
   * What to show after the user explicitly disconnects.
   * Same options as `idleView`. Separated internally for future flexibility.
   * @default uses same value as `idleView`
   */
  disconnectedView?: InactiveView;

  /**
   * What to show when connected and no signing request is pending.
   * - `"hidden"` — collapse to 0×0 (iframe stays in DOM for signing)
   * - `"visible"` — keep showing the iframe at full size
   * @default "hidden"
   */
  connectedView?: "hidden" | "visible";

  /**
   * How to display the approval UI when a `requireAuth` signing request is pending.
   * - `"modal"` — show iframe as a centered modal overlay with backdrop
   * - `"inline"` — uncollapse the iframe inline at its current position
   * @default "modal"
   */
  approvalView?: "modal" | "inline";

  /** Label for the login button (when view is `"button"`). @default "Sign in with XION" */
  loginLabel?: ReactNode;
  /** className applied to the login button. */
  loginButtonClassName?: string;
  /** Inline style applied to the login button. */
  loginButtonStyle?: CSSProperties;

  /**
   * className applied to the modal container when `approvalView="modal"`.
   * Use this to style the approval modal wrapper (border-radius, shadow, etc.).
   */
  modalClassName?: string;
  /**
   * Inline style applied to the modal container when `approvalView="modal"`.
   * Overrides the default modal sizing. The default is a compact centered card
   * (`width: 420px`, `maxHeight: 90vh`).
   */
  modalStyle?: CSSProperties;
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const collapsedStyle: CSSProperties = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  padding: 0,
  margin: 0,
};

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  background: "rgba(0, 0, 0, 0.6)",
};

/**
 * Default modal container style — a compact, centered card.
 * The iframe content (dashboard SignTransactionView) has a transparent
 * background, so only the card content is visible.
 */
/** Wrapper that centers the modal + close button together. */
const modalWrapperStyle: CSSProperties = {
  position: "fixed",
  zIndex: 9999,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const closeButtonStyle: CSSProperties = {
  position: "absolute",
  top: -12,
  right: -12,
  zIndex: 1,
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "1px solid rgba(0, 0, 0, 0.1)",
  background: "white",
  color: "#666",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const defaultModalStyle: CSSProperties = {
  position: "relative",
  width: 420,
  height: 600,
  maxHeight: "90vh",
  // Reset collapsed properties explicitly so the iframe can expand
  minWidth: "auto",
  minHeight: "auto",
  overflow: "hidden",
  padding: 0,
  margin: 0,
  borderRadius: 16,
};

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Drop-in component for embedded (inline iframe) authentication.
 *
 * Place once in your layout — it manages login, connection, disconnect, and
 * signing-approval states automatically based on props.
 *
 * ```tsx
 * <AbstraxionEmbed
 *   idleView="button"
 *   connectedView="hidden"
 *   approvalView="modal"
 *   style={{ width: 420, height: 600 }}
 *   loginLabel="Sign in with XION"
 * />
 * ```
 *
 * The underlying `<div>` (iframe container) stays in the DOM at all times so
 * the controller's container reference is never lost.
 */
export const AbstraxionEmbed = forwardRef<HTMLDivElement, AbstraxionEmbedProps>(
  function AbstraxionEmbed(
    {
      idleView = "button",
      disconnectedView: disconnectedViewProp,
      connectedView = "hidden",
      approvalView = "modal",
      loginLabel = "Sign in with XION",
      loginButtonClassName,
      loginButtonStyle,
      modalClassName,
      modalStyle,
      ...divProps
    },
    forwardedRef,
  ) {
    const disconnectedView = disconnectedViewProp ?? idleView;

    const internalRef = useRef<HTMLDivElement>(null);
    const {
      controller,
      isConnected,
      isConnecting,
      isDisconnected,
      isAwaitingApproval,
      abstraxionError,
      login,
    } = useContext(AbstraxionContext);

    // ── Ref merging ──────────────────────────────────────────────────────
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        (internalRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (
            forwardedRef as React.MutableRefObject<HTMLDivElement | null>
          ).current = node;
        }
      },
      [forwardedRef],
    );

    // ── Attach container to IframeController ─────────────────────────────
    useLayoutEffect(() => {
      if (internalRef.current && controller instanceof IframeController) {
        controller.setContainerElement(internalRef.current);
      }
    }, [controller]);

    // ── Start login when idleView/disconnectedView is "fullview" ───────────
    useEffect(() => {
      if (!controller) return;

      const activeInactiveView = isDisconnected ? disconnectedView : idleView;
      const isCurrentlyFullview = activeInactiveView === "fullview";

      const shouldAutoLogin =
        // Idle (never connected): auto-start when configured for fullview
        (!isConnected &&
          !isConnecting &&
          !isDisconnected &&
          !abstraxionError &&
          idleView === "fullview") ||
        // Explicitly disconnected: re-start login flow if fullview is configured
        (isDisconnected &&
          !abstraxionError &&
          disconnectedView === "fullview") ||
        // Error in fullview mode: auto-retry so the iframe recovers without user action
        (!!abstraxionError && isCurrentlyFullview);

      if (shouldAutoLogin) {
        login().catch((err) => {
          console.log("[AbstraxionEmbed] Auto-login:", err.message);
        });
      }
    }, [
      controller,
      isConnected,
      isConnecting,
      isDisconnected,
      abstraxionError,
      idleView,
      disconnectedView,
      login,
    ]);

    // ── Dismiss modal on Escape ──────────────────────────────────────────
    useEffect(() => {
      if (!isAwaitingApproval || approvalView !== "modal") return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && controller instanceof IframeController) {
          controller.cancelApproval();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isAwaitingApproval, approvalView, controller]);

    // ── Actions ──────────────────────────────────────────────────────────

    const handleLogin = useCallback(() => {
      login().catch(console.error);
    }, [login]);

    const handleDismissModal = useCallback(() => {
      if (controller instanceof IframeController) {
        controller.cancelApproval();
      }
    }, [controller]);

    // ── Determine visual state ───────────────────────────────────────────

    const inactiveView = isDisconnected ? disconnectedView : idleView;
    const isInactive = !isConnected && !isConnecting;
    const showAsModal =
      isConnected && isAwaitingApproval && approvalView === "modal";
    const showInline =
      isConnected && isAwaitingApproval && approvalView === "inline";

    // In fullview mode the iframe is always meant to be visible — don't collapse
    // or fall back to a button on error. The auto-login effect will retry.
    const isFullviewMode = inactiveView === "fullview";

    const collapseIframe =
      (isConnected && !isAwaitingApproval && connectedView === "hidden") ||
      (isInactive && inactiveView !== "fullview") ||
      (!!abstraxionError && !isFullviewMode);
    const showButton =
      (isInactive && inactiveView === "button") ||
      (!!abstraxionError && !isFullviewMode);

    // ── Compute iframe container style ───────────────────────────────────
    // The container <div> is always in DOM. Its style changes based on state:
    //   - collapsed: 0×0 (iframe hidden but alive)
    //   - modal: fixed-positioned centered overlay
    //   - normal: developer's dimensions via style/className props

    let containerStyle: CSSProperties | undefined;
    let containerClassName: string | undefined;

    if (showAsModal) {
      // Modal: use compact default sizing, let dev override via modalStyle/modalClassName
      containerStyle = { ...defaultModalStyle, ...modalStyle };
      containerClassName = modalClassName;
    } else if (collapseIframe && !showInline) {
      containerStyle = collapsedStyle;
      containerClassName = undefined;
    } else {
      // Inline: connecting, idle+iframe, connected+visible, or approval+inline
      containerStyle = divProps.style;
      containerClassName = divProps.className;
    }

    return (
      <>
        {/* Login button — shown when inactive with "button" view or on error */}
        {showButton && (
          <button
            className={loginButtonClassName}
            style={loginButtonStyle}
            onClick={handleLogin}
          >
            {loginLabel}
          </button>
        )}

        {/* Modal backdrop — click to dismiss */}
        {showAsModal && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div style={backdropStyle} onClick={handleDismissModal} />
        )}

        {/* Modal wrapper: positions the close button + iframe container together */}
        <div style={showAsModal ? modalWrapperStyle : undefined}>
          {showAsModal && (
            <button
              type="button"
              onClick={handleDismissModal}
              aria-label="Close"
              style={closeButtonStyle}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M1 1l12 12M13 1 1 13" />
              </svg>
            </button>
          )}

          {/* Iframe container — always in DOM, never remounted */}
          <div
            ref={setRefs}
            {...divProps}
            style={containerStyle}
            className={containerClassName}
          />
        </div>
      </>
    );
  },
);
