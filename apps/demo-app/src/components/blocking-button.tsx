import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface BlockingButtonProps {
  text: string;

  /**
   * Function to execute when button is pressed
   */
  onExecute(): Promise<void>;
}

export function BlockingButton({ text, onExecute }: BlockingButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      // Execute the supplied function
      await onExecute();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="hover:ui-bg-neutral-100 min-w-full rounded-md bg-white px-4 py-2 text-black shadow-md"
      onClick={() => {
        void handleClick();
      }}
      disabled={loading}
    >
      {loading ? (
        <p>
          <ArrowPathIcon className="h-5 w-5 animate-spin content-center" />
        </p>
      ) : (
        text
      )}
    </button>
  );
}
