import { InputHTMLAttributes, useState } from "react";

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix">;

export interface ITextFieldProps extends BaseInputProps {
  className?: string;
  error?: string;
}
export function Input({
  className,
  placeholder,
  value,
  error,
  onBlur,
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
        className={`ui-relative ui-z-0 ui-w-auto ${
          isInputFocused || value ? "ui-top-2 ui-text-xs" : "ui-top-7"
        } ui-text-zinc-600`}
      >
        {placeholder}
      </label>
      <input
        {...props}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`ui-z-10 ui-block ui-h-8 ui-w-full ui-border-b ui-relative ${
          error ? "ui-border-red-400" : ""
        } ui-bg-transparent ui-text-sm ui-text-white ui-outline-none`}
      />
    </div>
  );
}
