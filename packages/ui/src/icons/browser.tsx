import { cn } from "../../lib/utils";

export const BrowserIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="160"
      height="104"
      viewBox="0 0 160 104"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("ui-h-28 ui-w-40", className)}
    >
      <rect
        width="159.467"
        height="104"
        rx="12"
        fill="white"
        fillOpacity="0.2"
      />
      <rect
        x="0.5"
        y="0.5"
        width="158.467"
        height="103"
        rx="11.5"
        stroke="white"
        strokeOpacity="0.4"
      />
      <circle
        cx="12.1334"
        cy="6.93203"
        r="2.6"
        fill="white"
        fillOpacity="0.4"
      />
      <circle
        cx="22.5333"
        cy="6.93203"
        r="2.6"
        fill="white"
        fillOpacity="0.4"
      />
      <circle
        cx="32.9333"
        cy="6.93203"
        r="2.6"
        fill="white"
        fillOpacity="0.4"
      />
      <line
        y1="12.5"
        x2="159.467"
        y2="12.5"
        stroke="white"
        strokeOpacity="0.4"
      />
    </svg>
  );
};
