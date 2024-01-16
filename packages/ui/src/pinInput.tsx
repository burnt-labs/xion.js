import React, { useState, useEffect, useRef, ChangeEvent } from "react";

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  error?: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export const PinInput: React.FC<PinInputProps> = ({
  length = 6,
  onComplete,
  error,
  setError,
}) => {
  const [pin, setPin] = useState(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(
    Array(length).fill(null),
  );

  const handleInput = (index: number, value: string) => {
    const newDigit = /^\d$/.test(value) ? value : "";
    const newPin = [...pin];
    newPin[index] = newDigit;

    setPin(newPin);

    if (!newPin.includes("")) {
      onComplete(newPin.join(""));
    }

    if (index < length - 1 && newDigit !== "") {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number) => {
    const newPin = [...pin];
    if (index >= 0) {
      newPin[index] = "";
      inputRefs.current[index - 1]?.focus();
    }

    setPin(newPin);
  };

  useEffect(() => {
    // Focus the first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedData = event.clipboardData.getData("text");
    const pastedDigits = pastedData
      .split("")
      .filter((char) => /^\d$/.test(char))
      .slice(0, length);
    const newPin = [...pin];

    pastedDigits.forEach((digit, index) => {
      if (index < length) {
        newPin[index] = digit;
      }
    });

    setPin(newPin);
    onComplete(newPin.join(""));

    inputRefs.current[Math.min(length - 1, pastedDigits.length - 1)]?.focus();
  };

  return (
    <div className="ui-flex ui-w-full ui-justify-between">
      {pin.map((value, index) => (
        <input
          key={index}
          type="text"
          value={value}
          maxLength={1}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setError("");
            handleInput(index, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              handleBackspace(index);
            }
          }}
          onPaste={handlePaste}
          className={`ui-block ui-bg-transparent ui-text-white ui-rounded-md ui-border-2 ui-text-center ui-text-sm ui-outline-none focus:ui-border-black focus:ui-ring-white disabled:ui-pointer-events-none disabled:ui-opacity-50 ui-w-[50px] ui-h-[50px] ${
            error ? "ui-border-red-500" : "ui-border-zinc-600"
          }`}
          autoFocus={index === 0}
          ref={(ref) => (inputRefs.current[index] = ref)}
        />
      ))}
    </div>
  );
};
