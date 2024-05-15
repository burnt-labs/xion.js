import type { InputHTMLAttributes } from "react";
import { useState } from "react";

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix">;

export interface ITextFieldProps extends BaseInputProps {
  className?: string;
  error?: string;
  baseInputClassName?: string;
  onKeyDown?: (e: any) => false | Promise<void>;
}
export function Input({
  className,
  placeholder,
  // This should only be used for specific classes that can't override the base input styles.
  baseInputClassName,
  value,
  error,
  onBlur,
  onKeyDown,
  ...props
}: ITextFieldProps) {
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleFocus = () => {
    setIsInputFocused(true);
  };

  const handleBlur = (event: any) => {
    if (event.target.value === "") {
      setIsInputFocused(false);
    }
    onBlur?.(event);
  };

  return (
    <div className={`ui-relative ui-w-full ui-text-left ${className || ""}`}>
      {error ? (
        <p className="ui-right-0 ui-top-2 ui-text-xs ui-absolute ui-text-red-400">
          {error}
        </p>
      ) : null}
      <label
        className={`ui-relative ui-z-0 ui-w-auto ui-font-akkuratLL ${
          isInputFocused || value
            ? "ui-top-2 ui-text-xs ui-leading-tight"
            : "ui-top-7"
        } ui-text-neutral-400`}
      >
        {placeholder}
      </label>
      <input
        {...props}
        className={`${
          baseInputClassName || ""
        } ui-z-10 ui-block ui-h-8 ui-w-full ui-border-b ui-relative ${
          error ? "ui-border-red-400" : ""
        } ui-bg-transparent ui-font-akkuratLL ui-py-5 !ui-text-sm ui-text-zinc-100 ui-font-normal ui-leading-tight ui-outline-none`}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
        style={{
          WebkitBorderRadius: "none",
        }}
        value={value}
      />
    </div>
  );
}
