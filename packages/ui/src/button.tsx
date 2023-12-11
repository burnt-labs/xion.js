import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  structure?: "base" | "outlined" | "naked" | "destructive";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  fullWidth = false,
  structure = "base",
  disabled = false,
  children,
  ...props
}) => {
  const getButtonClasses = () => {
    if (disabled) {
      switch (structure) {
        case "outlined":
          return "ui-bg-transparent ui-border ui-border-zinc-600 ui-text-zinc-600 ui-pointer-events-none";
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
        return "ui-border ui-bg-transparent ui-border-zinc-300 ui-text-white hover:ui-bg-white/5";
      case "naked":
        return "ui-border-none ui-bg-transparent ui-text-white ui-underline ui-font-normal";
      case "destructive":
        return "ui-bg-red-500 ui-text-white hover:ui-bg-red-400";
      default:
        return "ui-bg-white ui-text-black hover:ui-bg-zinc-100";
    }
  };

  return (
    <button
      className={`ui-rounded ui-px-5 ui-py-3.5 ui-text-sm ui-font-bold ui-outline-none ui-hover:opacity-70 ${
        fullWidth ? "ui-w-full" : ""
      } ${getButtonClasses()}`}
      {...props}
    >
      {children}
    </button>
  );
};
