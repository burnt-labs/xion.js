import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      "ui-bg-black/80 ui-data-[state=open]:ui-animate-in ui-data-[state=closed]:ui-animate-out ui-data-[state=closed]:ui-fade-out-0 ui-data-[state=open]:ui-fade-in-0 ui-fixed ui-inset-0 ui-z-50 ui-backdrop-blur-lg",
      className,
    )}
    ref={ref}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <div className="ui-absolute ui-h-screen ui-w-screen ui-inset-0 ui-bg-modal-overlay ui-backdrop-blur-3xl ui-opacity-40 ui-bg-no-repeat ui-bg-cover ui-bg-center ui-bg-fixed ui-z-[60]" />
    <DialogPrimitive.Content
      className={cn(
        "sm:ui-bg-black/20 sm:ui-backdrop-blur-2xl ui-data-[state=open]:ui-animate-in ui-data-[state=closed]:ui-animate-out ui-data-[state=closed]:ui-fade-out-0 ui-data-[state=open]:ui-fade-in-0 ui-data-[state=closed]:ui-zoom-out-95 ui-data-[state=open]:ui-zoom-in-95 ui-data-[state=closed]:ui-slide-out-to-left-1/2 ui-data-[state=closed]:ui-slide-out-to-top-[48%] ui-data-[state=open]:ui-slide-in-from-left-1/2 ui-data-[state=open]:ui-slide-in-from-top-[48%] ui-fixed ui-z-[70] ui-grid ui-w-full ui-max-w-lg ui-gap-4 ui-p-6 ui-duration-200 sm:ui-rounded-[48px] ui-left-[50%] ui-top-[50%] ui-translate-x-[-50%] ui-translate-y-[-50%]",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "ui-flex ui-flex-col ui-space-y-1.5 ui-text-center sm:ui-text-left",
        className,
      )}
      {...props}
    />
  );
}
DialogHeader.displayName = "DialogHeader";

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "ui-flex ui-flex-col-reverse sm:ui-flex-row sm:ui-justify-end sm:ui-space-x-2",
        className,
      )}
      {...props}
    />
  );
}
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    className={cn(
      "ui-text-lg ui-font-semibold ui-leading-none ui-tracking-tight",
      className,
    )}
    ref={ref}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    className={cn("ui-text-neutral-500 ui-text-sm", className)}
    ref={ref}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
