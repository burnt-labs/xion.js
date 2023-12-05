import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  fullWidth = false,
  error,
  ...props
}) => {
  return (
    <div
      className={`ui-flex ui-flex-col ui-gap-1 ${fullWidth ? "ui-w-full" : ""}`}
    >
      <input
        className={`ui-bg-zinc-100 ui-text-black ui-p-3 ui-rounded ui-border-none ui-outline-none ${
          fullWidth ? "ui-w-full" : ""
        }`}
        {...props}
      />
      <span className="ui-text-red-500 ui-text-xs">{error}</span>
    </div>
  );
};
