import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, children, ...props }, forwardedRef) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      className={cn(
        "ui-rounded ui-text-white ui-z-50 ui-p-2 ui-bg-[#434040] ui-data-[state=open]:ui-data-[side=top]:ui-animate-slideDownAndFade ui-data-[state=open]:ui-data-[side=right]:ui-animate-slideLeftAndFade ui-data-[state=open]:ui-data-[side=bottom]:ui-animate-slideUpAndFade ui-data-[state=open]:ui-data-[side=left]:ui-animate-slideRightAndFade",
        className,
      )}
      ref={forwardedRef}
      {...props}
    >
      {children}
      <PopoverPrimitive.Arrow className="ui-fill-[#434040]" />
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
