import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

interface WithChildrenProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ModalAnchor = forwardRef<HTMLDivElement, WithChildrenProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          "ui-flex ui-p-4 ui-justify-center ui-items-center ui-fixed ui-inset-0 ui-h-screen ui-w-screen ui-z-[999]",
          className,
        )}
        ref={ref}
        {...props}
      >
        <div className="ui-absolute ui-z-[999] ui-inset-0 ui-bg-modal-overlay ui-blur-md ui-bg-no-repeat ui-bg-cover ui-bg-center ui-bg-fixed ui-opacity-70" />
        {children}
      </div>
    );
  },
);

ModalAnchor.displayName = "ModalAnchor";

export function Modal({
  className,
  children,
  ...props
}: WithChildrenProps): JSX.Element {
  return (
    <div
      className={cn(
        "ui-relative ui-w-full ui-max-w-[465px] ui-text-black ui-rounded ui-z-[1000] ui-bg-black/25 backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ModalCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function ModalClose({
  className,
  children,
  ...props
}: ModalCloseProps): JSX.Element {
  return (
    <button
      className={cn(
        "ui-p-2 ui-rounded-lg ui-absolute ui-top-4 ui-right-4 ui-z-[1001] ui-border-none ui-flex ui-items-center ui-justify-center ui-bg-transparent ui-cursor-pointer hover:ui-bg-zinc-100",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function ModalSection({
  className,
  children,
  ...props
}: WithChildrenProps): JSX.Element {
  return (
    <div
      className={cn(
        "ui-inline-flex ui-w-full ui-h-full ui-p-10 ui-flex-col ui-items-start ui-justify-between ui-gap-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
