import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  structure?:
    | "base"
    | "outlined"
    | "naked"
    | "destructive"
    | "destructive-outline";
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const Button: React.FC<ButtonProps> = ({
  fullWidth = false,
  structure = "base",
  disabled = false,
  onClick,
  children,
  className,
  ...props
}) => {
  const getButtonClasses = () => {
    if (disabled) {
      switch (structure) {
        case "outlined":
          return "ui-bg-transparent ui-border ui-border-neutral-600 ui-text-neutral-600 ui-pointer-events-none";
        case "naked":
          return "ui-border-none ui-bg-transparent ui-text-white/60 ui-underline ui-font-normal ui-pointer-events-none";
        case "destructive":
          return "ui-bg-red-500/60 ui-text-white hover:ui-bg-red-600 ui-pointer-events-none";
        default:
          return "ui-bg-white/60 ui-text-black ui-pointer-events-none";
      }
    }

    switch (structure) {
      case "outlined":
        return "ui-border ui-bg-transparent ui-border-neutral-300 ui-border-opacity-50 ui-text-white hover:ui-bg-white/5";
      case "naked":
        return "ui-border-none ui-bg-transparent ui-text-white ui-underline ui-font-normal";
      case "destructive":
        return "ui-bg-red-500 ui-text-white hover:ui-bg-red-400";
      case "destructive-outline":
        return "ui-border ui-border-red-500 ui-bg-transparent ui-text-red-500 hover:ui-bg-red-500/5";
      default:
        return "ui-bg-white ui-text-black hover:ui-bg-neutral-100";
    }
  };

  return (
    <button
      className={`ui-flex ui-items-center ui-justify-center ui-rounded-md ui-font-akkuratLL ui-uppercase ui-px-5 ui-py-3.5 ui-text-sm ui-outline-none ui-hover:opacity-70 ${
        fullWidth ? "ui-w-full" : ""
      } ${getButtonClasses()} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
