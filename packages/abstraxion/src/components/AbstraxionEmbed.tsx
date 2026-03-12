"use client";

import {
  useContext,
  useEffect,
  useRef,
  forwardRef,
  type HTMLAttributes,
} from "react";
import { AbstraxionContext } from "../AbstraxionProvider";
import { IframeController } from "../controllers/IframeController";

export interface AbstraxionEmbedProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * Automatically start the embedded auth flow once the container is mounted.
   * Defaults to true — set to false if you want to call login() manually.
   */
  autoConnect?: boolean;
}

/**
 * Drop-in component that renders the embedded authentication view.
 *
 * Place this anywhere in your layout when using `authentication: { type: "embedded" }`.
 * The embedded view fills 100% of this component — control sizing via style/className.
 *
 * ```tsx
 * <AbstraxionEmbed style={{ width: 420, height: 600 }} />
 * ```
 *
 * By default the auth flow starts automatically when mounted. Pass
 * `autoConnect={false}` to start it manually via `useAbstraxionAccount().login()`.
 */
export const AbstraxionEmbed = forwardRef<
  HTMLDivElement,
  AbstraxionEmbedProps
>(function AbstraxionEmbed(
  { autoConnect = true, ...divProps },
  forwardedRef,
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const { controller, isConnected, isConnecting, isInitializing, login } =
    useContext(AbstraxionContext);

  // Merge forwarded ref with internal ref
  const setRefs = (node: HTMLDivElement | null) => {
    (internalRef as React.MutableRefObject<HTMLDivElement | null>).current =
      node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    }
  };

  // Attach the container element to the IframeController
  useEffect(() => {
    if (internalRef.current && controller instanceof IframeController) {
      controller.setContainerElement(internalRef.current);
    }
  }, [controller]);

  // Auto-connect: start the embedded auth flow once the controller is ready
  useEffect(() => {
    if (
      autoConnect &&
      !isInitializing &&
      !isConnected &&
      !isConnecting &&
      controller
    ) {
      login().catch((err) => {
        console.log("[AbstraxionEmbed] Auto-connect:", err.message);
      });
    }
  }, [autoConnect, isInitializing, isConnected, isConnecting, controller]);

  return <div ref={setRefs} {...divProps} />;
});
