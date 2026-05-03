/**
 * Pure helper that maps `<AbstraxionEmbed>` runtime state to the three
 * display flags consumed by the renderer. Lives in its own module so unit
 * tests can import it without pulling in `react-native` (the embed itself
 * imports `View` / `Modal` / `Pressable`).
 *
 * The auto-modal-during-login path is what makes idle-hidden / button-mode
 * embeds usable on RN: without it the WebView lives inside a 0×0 container
 * during login and the user can't see the dashboard's authenticator picker.
 */

export type EmbedInactiveView = "button" | "fullview" | "hidden";

export interface EmbedDisplayState {
  isConnected: boolean;
  isConnecting: boolean;
  isAwaitingApproval: boolean;
  abstraxionError: string;
  inactiveView: EmbedInactiveView;
  connectedView: "hidden" | "visible";
  approvalView: "modal" | "inline";
}

export interface EmbedDisplayMode {
  showButton: boolean;
  showAsModal: boolean;
  collapse: boolean;
}

export function computeEmbedDisplayMode(
  state: EmbedDisplayState,
): EmbedDisplayMode {
  const {
    isConnected,
    isConnecting,
    isAwaitingApproval,
    abstraxionError,
    inactiveView,
    connectedView,
    approvalView,
  } = state;

  const isInactive = !isConnected && !isConnecting;
  const isFullview = inactiveView === "fullview";

  const showButton =
    (isInactive && inactiveView === "button") ||
    (!!abstraxionError && !isFullview);

  const showAsModal =
    approvalView === "modal" &&
    ((isConnected && isAwaitingApproval) || (isConnecting && !isFullview));

  const collapse =
    !showAsModal &&
    ((isConnected && !isAwaitingApproval && connectedView === "hidden") ||
      (isInactive && !isFullview) ||
      (!!abstraxionError && !isFullview));

  return { showButton, showAsModal, collapse };
}
