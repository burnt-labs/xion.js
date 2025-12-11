import React from "react";
import { useAbstraxionAccount } from "@burnt-labs/abstraxion";
import { useAbstraxionModal } from "./hooks/useAbstraxionModal";

// This component expects to be used within an AbstraxionProvider context
export interface AbstraxionProps {
  onClose: () => void;
  /**
   * Optional: Control modal open state externally.
   * If not provided, modal will auto-show when connecting (backward compatible behavior).
   *
   * @default undefined (auto-managed)
   */
  isOpen?: boolean;
}

/**
 * Abstraxion - Convenience wrapper component for Abstraxion authentication modal
 *
 * **Backward Compatible**: Works with or without `isOpen` prop.
 *
 * This is a simple wrapper around `useAbstraxionModal` hook. For more control,
 * consider using the hook directly:
 *
 * ```tsx
 * import { useAbstraxionAccount } from "@burnt-labs/abstraxion";
 * import { useAbstraxionModal } from "@burnt-labs/ui";
 *
 * const accountState = useAbstraxionAccount();
 * const { Modal, LoadingOverlay, openModal } = useAbstraxionModal(accountState);
 * ```
 *
 * @example
 * // Backward compatible usage (OLD API - still works!)
 * ```tsx
 * import { Abstraxion } from "@burnt-labs/ui";
 * import { AbstraxionProvider } from "@burnt-labs/abstraxion";
 *
 * function App() {
 *   return (
 *     <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
 *       <Abstraxion onClose={() => console.log('closed')} />
 *     </AbstraxionProvider>
 *   );
 * }
 * ```
 *
 * @example
 * // New controlled usage (NEW API - more control)
 * ```tsx
 * import { Abstraxion } from "@burnt-labs/ui";
 * import { AbstraxionProvider } from "@burnt-labs/abstraxion";
 *
 * function App() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <AbstraxionProvider config={{ chainId: "xion-testnet-1" }}>
 *       <Abstraxion isOpen={isOpen} onClose={() => setIsOpen(false)} />
 *       <button onClick={() => setIsOpen(true)}>Connect</button>
 *     </AbstraxionProvider>
 *   );
 * }
 * ```
 */
export const Abstraxion: React.FC<AbstraxionProps> = ({ isOpen, onClose }) => {
  const accountState = useAbstraxionAccount();

  // If isOpen is provided, use controlled mode. Otherwise, use auto-show mode (backward compatible)
  const { Modal, LoadingOverlay } = useAbstraxionModal(accountState, {
    isOpen, // undefined = auto-managed, boolean = controlled
    autoShowOnConnecting: isOpen === undefined, // Auto-show only if not controlled
    onClose,
  });

  return (
    <>
      <Modal />
      <LoadingOverlay />
    </>
  );
};
