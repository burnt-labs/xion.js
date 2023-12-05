import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  fullWidth = false,
  ...props
}) => {
  return (
    <button
      className={`ui-text-sm ui-font-bold dark:ui-text-black ui-text-white ui-px-5 ui-py-3.5 ui-rounded ui-border-none ui-outline-none ui-bg-zinc-900 dark:ui-bg-zinc-100 hover:ui-bg-zinc-800 dark:hover:ui-bg-zinc-200 hover:ui-cursor-pointer ${
        fullWidth ? "ui-w-full" : ""
      }`}
      {...props}
    />
  );
};
