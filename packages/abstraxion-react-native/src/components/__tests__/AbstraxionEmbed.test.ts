import { describe, expect, it } from "vitest";
import { computeEmbedDisplayMode } from "../embedDisplayMode";

const baseState = {
  isConnected: false,
  isConnecting: false,
  isAwaitingApproval: false,
  abstraxionError: "",
  inactiveView: "button" as const,
  connectedView: "hidden" as const,
  approvalView: "modal" as const,
};

describe("computeEmbedDisplayMode", () => {
  it("collapses to 0×0 while idle with button view", () => {
    const result = computeEmbedDisplayMode(baseState);

    expect(result.showButton).toBe(true);
    expect(result.collapse).toBe(true);
    expect(result.showAsModal).toBe(false);
  });

  it("surfaces the WebView as a modal during isConnecting (button mode)", () => {
    // The bug fix: while isConnecting and idleView !== "fullview", the embed
    // must NOT collapse the WebView to 0×0 — it must surface it so the user
    // can interact with the dashboard's authenticator picker.
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnecting: true,
    });

    expect(result.showAsModal).toBe(true);
    expect(result.collapse).toBe(false);
    expect(result.showButton).toBe(false);
  });

  it("surfaces the WebView as a modal during isConnecting (hidden mode)", () => {
    // Same gap exists when consumers set idleView="hidden" with no `style`.
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnecting: true,
      inactiveView: "hidden",
    });

    expect(result.showAsModal).toBe(true);
    expect(result.collapse).toBe(false);
    expect(result.showButton).toBe(false);
  });

  it("renders inline (no modal) during isConnecting in fullview mode", () => {
    // In fullview the consumer has already given the embed real estate via
    // the layout — auto-modal would double-render the login UI.
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnecting: true,
      inactiveView: "fullview",
    });

    expect(result.showAsModal).toBe(false);
    expect(result.collapse).toBe(false);
  });

  it("does not modal-promote while connecting if approvalView is inline", () => {
    // approvalView=inline opts the consumer into managing layout themselves;
    // we mirror that for the connecting state too rather than forcing a modal.
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnecting: true,
      approvalView: "inline",
    });

    expect(result.showAsModal).toBe(false);
    expect(result.collapse).toBe(false);
  });

  it("modal-promotes for approval after connect (existing behavior preserved)", () => {
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnected: true,
      isAwaitingApproval: true,
    });

    expect(result.showAsModal).toBe(true);
    expect(result.collapse).toBe(false);
  });

  it("collapses when connected with no pending approval and connectedView=hidden", () => {
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnected: true,
    });

    expect(result.collapse).toBe(true);
    expect(result.showAsModal).toBe(false);
    expect(result.showButton).toBe(false);
  });

  it("renders inline when connected with connectedView=visible", () => {
    const result = computeEmbedDisplayMode({
      ...baseState,
      isConnected: true,
      connectedView: "visible",
    });

    expect(result.collapse).toBe(false);
    expect(result.showAsModal).toBe(false);
  });

  it("shows the login button on error in button mode", () => {
    const result = computeEmbedDisplayMode({
      ...baseState,
      abstraxionError: "boom",
    });

    expect(result.showButton).toBe(true);
    expect(result.collapse).toBe(true);
  });

  it("does not collapse on error when in fullview mode", () => {
    const result = computeEmbedDisplayMode({
      ...baseState,
      inactiveView: "fullview",
      abstraxionError: "boom",
    });

    expect(result.collapse).toBe(false);
    expect(result.showButton).toBe(false);
  });
});
