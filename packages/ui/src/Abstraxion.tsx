import React from "react";
import { useAbstraxionAccount } from "@burnt-labs/abstraxion";
import { useAbstraxionModal } from "./hooks/useAbstraxionModal";

// This component expects to be used within an AbstraxionProvider context
export interface AbstraxionProps {
  onClose: () => void;
  isOpen: boolean;
}

/**
 * Abstraxion - Convenience wrapper component for Abstraxion authentication modal
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
  const { Modal, LoadingOverlay } = useAbstraxionModal(accountState, {
    isOpen, // Pass isOpen prop to control modal externally
    autoShowOnConnecting: false, // Don't auto-show, respect isOpen prop
    onClose,
  });

  return (
    <>
      <Modal />
      <LoadingOverlay />
    </>
  );
};

