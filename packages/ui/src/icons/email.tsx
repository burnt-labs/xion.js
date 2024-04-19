import { cn } from "../../lib/utils";

export const EmailIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={cn("ui-h-5 ui-w-5", className)}
      width="16"
      height="13"
      viewBox="0 0 16 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.4 0H1.6C0.72 0 0.00799999 0.72 0.00799999 1.6L0 11.2C0 12.08 0.72 12.8 1.6 12.8H14.4C15.28 12.8 16 12.08 16 11.2V1.6C16 0.72 15.28 0 14.4 0ZM14.4 3.2L8 7.2L1.6 3.2V1.6L8 5.6L14.4 1.6V3.2Z"
        fill="white"
      />
    </svg>
  );
};
