import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  structure?: "base" | "outlined" | "naked";
  theme?: "primary" | "secondary" | "destructive";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  fullWidth = false,
  structure = "base",
  theme = "default",
  disabled = false,
  children,
  ...props
}) => {
  const getButtonClasses = () => {
    if (disabled) {
      switch (structure) {
        case "base":
          return "ui-bg-gray-400 ui-text-white ui-pointer-events-none";
        case "outlined":
          return "ui-bg-transparent ui-border ui-border-zinc-300 ui-text-zinc-300 dark:ui-text-zinc-600 ui-pointer-events-none";
        case "naked":
          return "ui-text-gray-400 ui-pointer-events-none";
        default:
          return "";
      }
    }

    switch (structure) {
      case "outlined":
        switch (theme) {
          case "primary":
            return "ui-border ui-border-zinc-300 ui-bg-transparent ui-text-black dark:ui-text-white hover:ui-bg-black/5 dark:hover:ui-bg-white/5";
          case "secondary":
            return "ui-border ui-border-zinc-300 ui-bg-transparent ui-text-white";
          case "destructive":
            return "ui-border ui-border-red-500 ui-bg-transparent ui-text-red-500";
          default:
            return "";
        }
      case "naked":
        switch (theme) {
          case "primary":
            return "ui-border-none ui-bg-transparent ui-text-black dark:ui-text-white ui-underline ui-font-normal";
          case "secondary":
            return "ui-border-none ui-bg-transparent ui-text-opacity-50";
          case "destructive":
            return "ui-border-none ui-bg-transparent ui-text-red-500";
          default:
            return "";
        }
      default:
        switch (theme) {
          case "primary":
            return "ui-bg-zinc-900 ui-text-white hover:ui-bg-zinc-800 dark:ui-bg-white dark:ui-text-black hover:dark:ui-bg-zinc-100";
          case "secondary":
            return "ui-bg-zinc-200 ui-text-black hover:ui-bg-zinc-300";
          case "destructive":
            return "ui-bg-red-500 ui-text-white";
          default:
            return "";
        }
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
