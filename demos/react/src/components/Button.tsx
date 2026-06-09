import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonStructure = "base" | "outlined";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  structure?: ButtonStructure;
  children: ReactNode;
}

export function Button({
  fullWidth,
  structure = "base",
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps): JSX.Element {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";
  const variant =
    structure === "outlined"
      ? "border border-white/20 bg-transparent text-white hover:bg-white/10"
      : "bg-white text-black hover:bg-gray-200";
  const width = fullWidth ? "w-full" : "";
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      {...rest}
      disabled={disabled}
      className={`${base} ${variant} ${width} ${disabledStyles} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
