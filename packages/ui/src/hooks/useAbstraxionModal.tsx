import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "../dialog";
import { Button } from "../button";
import { Spinner } from "../icons/spinner";
import { CloseIcon } from "../icons/close";
import { ErrorIcon } from "../icons/error";
import {
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../dialog";
import { cn } from "../../lib/utils";

// Types for account state (matches useAbstraxionAccount return type)
export interface AbstraxionAccountState {
  data: {
    bech32Address: string;
  };
  isConnected: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  isReturningFromAuth: boolean;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface UseAbstraxionModalOptions {
  /**
   * Whether the modal should be open by default
   * @default false
   */
  defaultOpen?: boolean;
  
  /**
   * External control of modal open state (if provided, overrides internal state)
   */
  isOpen?: boolean;
  
  /**
   * Whether to automatically show the modal when connecting
   * @default true
   */
  autoShowOnConnecting?: boolean;
  
  /**
   * Whether to show success state after connection
   * @default true
   */
  showSuccessState?: boolean;
  
  /**
   * Duration to show success state before auto-closing (ms)
   * @default 2000
   */
  successDuration?: number;
  
  /**
   * Custom error message to display
   */
  error?: string;
  
  /**
   * Callback when modal closes
   */
  onClose?: () => void;
  
  /**
   * Callback when connection succeeds
   */
  onConnectSuccess?: () => void;
}

export interface UseAbstraxionModalReturn {
  /**
   * Whether the modal is currently open
   */
  isOpen: boolean;
  
  /**
   * Function to open the modal
   */
  openModal: () => void;
  
  /**
   * Function to close the modal
   */
  closeModal: () => void;
  
  /**
   * Function to toggle the modal
   */
  toggleModal: () => void;
  
  /**
   * The modal component to render
   */
  Modal: React.ComponentType;
  
  /**
   * Loading overlay component (for full-screen overlays)
   */
  LoadingOverlay: React.ComponentType;
}

/**
 * Hook for managing Abstraxion authentication modal with loading states
 * 
 * This hook provides a complete modal experience with loading states, success display,
 * and error handling. It's designed to work with the `useAbstraxionAccount` hook
 * from `@burnt-labs/abstraxion`.
 * 
 * @example
 * ```tsx
 * import { useAbstraxionModal } from "@burnt-labs/ui";
 * import { useAbstraxionAccount } from "@burnt-labs/abstraxion";
 * 
 * function MyComponent() {
 *   const accountState = useAbstraxionAccount();
 *   const { Modal, LoadingOverlay, openModal } = useAbstraxionModal({
 *     accountState,
 *     autoShowOnConnecting: true,
 *   });
 *   
 *   return (
 *     <>
 *       <button onClick={openModal}>Connect</button>
 *       <Modal />
 *       <LoadingOverlay />
 *     </>
 *   );
 * }
 * ```
 */
export function useAbstraxionModal(
  accountState: AbstraxionAccountState,
  options: UseAbstraxionModalOptions = {}
): UseAbstraxionModalReturn {
  const {
    defaultOpen = false,
    isOpen: externalIsOpen,
    autoShowOnConnecting = true,
    showSuccessState = true,
    successDuration = 2000,
    error: externalError,
    onClose,
    onConnectSuccess,
  } = options;

  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  
  // Use external isOpen if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasConnecting, setWasConnecting] = useState(false);

  // Sync internal state with external isOpen prop
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setInternalIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  // Track connection state changes
  useEffect(() => {
    // Only auto-manage if not externally controlled
    if (externalIsOpen !== undefined) return;
    
    // Show modal when connecting starts (if autoShowOnConnecting is true)
    if (autoShowOnConnecting && accountState.isConnecting && !wasConnecting) {
      setInternalIsOpen(true);
      setWasConnecting(true);
    }

    // Handle successful connection
    if (wasConnecting && accountState.isConnected && !accountState.isConnecting) {
      setWasConnecting(false);
      if (showSuccessState) {
        setShowSuccess(true);
        onConnectSuccess?.();
        // Auto-close after success duration
        setTimeout(() => {
          setShowSuccess(false);
          setInternalIsOpen(false);
        }, successDuration);
      } else {
        setInternalIsOpen(false);
        onConnectSuccess?.();
      }
    }

    // Reset success state when disconnected
    if (!accountState.isConnected) {
      setShowSuccess(false);
    }
  }, [
    accountState.isConnecting,
    accountState.isConnected,
    wasConnecting,
    autoShowOnConnecting,
    showSuccessState,
    successDuration,
    onConnectSuccess,
    externalIsOpen,
  ]);

  const openModal = () => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen(true);
    }
  };
  const closeModal = () => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen(false);
    }
    setShowSuccess(false);
    onClose?.();
  };
  const toggleModal = () => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Determine error message (external error takes precedence)
  const error = externalError || undefined;

  // Loading overlay component
  const LoadingOverlay = () => {
    const shouldShow =
      accountState.isInitializing ||
      accountState.isConnecting ||
      accountState.isReturningFromAuth ||
      accountState.isLoggingIn;

    if (!shouldShow) return null;

    // Priority: Auth callback > logging in > regular connecting > initializing
    const getLoadingContent = () => {
      if (accountState.isReturningFromAuth) {
        return {
          title: "Completing Authentication",
          description: "Processing authentication from authorization server",
          borderColor: "ui-border-purple-500/50",
          bgColor: "ui-bg-purple-500/20",
          borderBgColor: "ui-border-purple-500/40",
          spinnerColor: "ui-border-purple-400",
          textColor: "ui-text-purple-400",
          progressColor: "ui-bg-purple-400",
        };
      }
      if (accountState.isLoggingIn) {
        return {
          title: "Redirecting to Authorization",
          description: "Opening XION dashboard for secure authentication",
          borderColor: "ui-border-blue-500/50",
          bgColor: "ui-bg-blue-500/20",
          borderBgColor: "ui-border-blue-500/40",
          spinnerColor: "ui-border-blue-400",
          textColor: "ui-text-blue-400",
          progressColor: "ui-bg-blue-400",
        };
      }
      if (accountState.isConnecting) {
        return {
          title: "Establishing Connection",
          description: "Connecting to your XION account and verifying permissions",
          borderColor: "ui-border-blue-500/50",
          bgColor: "ui-bg-blue-500/20",
          borderBgColor: "ui-border-blue-500/40",
          spinnerColor: "ui-border-blue-400",
          textColor: "ui-text-blue-400",
          progressColor: "ui-bg-blue-400",
        };
      }
      return {
        title: "Initializing Application",
        description: "Checking for existing authentication and restoring session",
        borderColor: "ui-border-yellow-500/50",
        bgColor: "ui-bg-yellow-500/20",
        borderBgColor: "ui-border-yellow-500/40",
        spinnerColor: "ui-border-yellow-400",
        textColor: "ui-text-yellow-400",
        progressColor: "ui-bg-yellow-400",
      };
    };

    const {
      title,
      description,
      borderColor,
      bgColor,
      borderBgColor,
      spinnerColor,
      textColor,
      progressColor,
    } = getLoadingContent();

    return (
      <div className="ui-fixed ui-inset-0 ui-z-50">
        {/* Overlay matching DialogOverlay styling */}
        <div className="ui-fixed ui-inset-0 ui-z-50 ui-backdrop-blur-lg ui-bg-black/80" />
        {/* Background pattern matching DialogContent */}
        <div className="ui-absolute ui-h-screen ui-w-screen ui-inset-0 ui-bg-modal-overlay ui-backdrop-blur-3xl ui-opacity-40 ui-bg-no-repeat ui-bg-cover ui-bg-center ui-bg-fixed ui-z-50" />
        {/* Content container matching DialogContent styling */}
        <div className="ui-z-50 ui-fixed ui-grid ui-w-full ui-max-w-lg ui-gap-4 ui-p-10 ui-duration-200 sm:ui-rounded-[48px] ui-left-[50%] ui-top-[50%] sm:ui-bg-black/20 ui-flex ui-justify-center ui-flex-col sm:ui-block sm:ui-flex-none ui-h-screen sm:ui-h-auto sm:ui-backdrop-blur-2xl ui-translate-x-[-50%] ui-translate-y-[-50%]">
          {/* DialogHeader equivalent */}
          <div className="ui-flex ui-flex-col ui-space-y-1.5 ui-text-center sm:ui-text-left">
            {/* DialogTitle equivalent */}
            <h2 className={cn("ui-text-lg ui-font-semibold ui-leading-none ui-tracking-tight", textColor)}>
              {title}
            </h2>
            {/* DialogDescription equivalent */}
            <p className="ui-text-neutral-500 ui-text-sm">{description}</p>
          </div>
          
          <div className="ui-flex ui-flex-col ui-items-center ui-justify-center ui-gap-6 ui-py-8">
            <div
              className={`ui-flex ui-h-16 ui-w-16 ui-items-center ui-justify-center ui-rounded-full ui-border-4 ${borderBgColor} ${bgColor}`}
            >
              <div className={`ui-w-8 ui-h-8 ${textColor}`}>
                <Spinner />
              </div>
            </div>
            
            {accountState.isLoggingIn && (
              <>
                <div className="ui-flex ui-items-center ui-justify-center ui-gap-2">
                  <div className="ui-inline-block ui-h-2 ui-w-2 ui-animate-bounce ui-rounded-full ui-bg-blue-400 [animation-delay:-0.3s]"></div>
                  <div className="ui-inline-block ui-h-2 ui-w-2 ui-animate-bounce ui-rounded-full ui-bg-blue-400 [animation-delay:-0.15s]"></div>
                  <div className="ui-inline-block ui-h-2 ui-w-2 ui-animate-bounce ui-rounded-full ui-bg-blue-400"></div>
                </div>
                <p className="ui-text-xs ui-text-neutral-400">
                  You'll be redirected back here after authentication
                </p>
              </>
            )}
            
            {accountState.isInitializing && (
              <div className="ui-w-full ui-max-w-xs">
                <div className="ui-h-2 ui-w-full ui-rounded-full ui-bg-white/5">
                  <div
                    className={`ui-h-2 ui-animate-pulse ui-rounded-full ${progressColor}`}
                    style={{ width: "60%" }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Modal component
  const Modal = () => {
    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={closeModal}>
        <DialogContent>
          <DialogClose className="ui-absolute ui-top-6 ui-right-6">
            <CloseIcon className="ui-w-4 ui-h-4" />
          </DialogClose>

          {error ? (
            <>
              <DialogHeader>
                <DialogTitle>OOPS! Something went wrong...</DialogTitle>
                <DialogDescription>{error}</DialogDescription>
              </DialogHeader>
              <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-center ui-justify-center ui-gap-8">
                <div className="ui-w-full ui-border ui-border-red-500/20 ui-rounded-lg ui-bg-red-500/10 ui-p-4 ui-flex ui-flex-col ui-items-center ui-text-center ui-gap-3">
                  <ErrorIcon />
                  <span className="ui-font-bold ui-text-lg ui-leading-[21.6px] ui-text-red-400">
                    Error Message
                  </span>
                  <p className="ui-text-base ui-font-bold ui-text-red-400">{error}</p>
                </div>
                <Button onClick={closeModal} fullWidth>
                  Close
                </Button>
              </div>
            </>
          ) : showSuccess && accountState.isConnected ? (
            <>
              <DialogHeader>
                <DialogTitle>Connection Successful!</DialogTitle>
                <DialogDescription>
                  Your account has been connected successfully.
                </DialogDescription>
              </DialogHeader>
              <div className="ui-flex ui-items-center ui-justify-center ui-py-8">
                <div className="ui-flex ui-flex-col ui-items-center ui-gap-4">
                  <div className="ui-flex ui-h-16 ui-w-16 ui-items-center ui-justify-center ui-rounded-full ui-bg-green-500/20">
                    <svg
                      className="ui-h-8 ui-w-8 ui-text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  {accountState.data.bech32Address && (
                    <div className="ui-text-center">
                      <p className="ui-text-xs ui-text-neutral-400 ui-mb-1">
                        Connected Address
                      </p>
                      <p className="ui-text-white ui-font-mono ui-text-sm">
                        {accountState.data.bech32Address}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {accountState.isConnected ? "Connected" : "Connect Account"}
                </DialogTitle>
                <DialogDescription>
                  {accountState.isLoading
                    ? "Processing..."
                    : accountState.isConnected
                      ? "Your account is connected"
                      : "Connect your account to continue"}
                </DialogDescription>
              </DialogHeader>

              <div className="ui-flex ui-flex-col ui-gap-4 ui-items-center ui-justify-center ui-py-8">

                {accountState.isLoading ? (
                  <div className="ui-flex ui-flex-col ui-items-center ui-gap-4">
                    <div className="ui-w-8 ui-h-8">
                      <Spinner />
                    </div>
                    <p className="ui-text-neutral-400 ui-text-sm">
                      {accountState.isInitializing
                        ? "Initializing..."
                        : accountState.isConnecting || accountState.isLoggingIn
                          ? "Connecting..."
                          : "Loading..."}
                    </p>
                  </div>
                ) : accountState.isConnected && accountState.data.bech32Address ? (
                  <div className="ui-flex ui-flex-col ui-gap-4 ui-w-full">
                    <div className="ui-p-4 ui-bg-white/5 ui-rounded-lg">
                      <p className="ui-text-xs ui-text-neutral-400 ui-mb-1">
                        Connected Address
                      </p>
                      <p className="ui-text-white ui-font-mono ui-text-sm">
                        {accountState.data.bech32Address}
                      </p>
                    </div>
                    <Button onClick={accountState.logout} structure="destructive" fullWidth>
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="ui-flex ui-flex-col ui-gap-4 ui-w-full">
                    <Button onClick={accountState.login} fullWidth>
                      Connect Account
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={closeModal} structure="outlined" fullWidth>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    Modal,
    LoadingOverlay,
  };
}

