import { useContext } from "react";
import { Button } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";

export const ErrorDisplay = ({
  message,
  onClose,
}: {
  message?: string;
  onClose: VoidFunction;
}) => {
  const { setAbstraxionError } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  return (
    <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-start ui-justify-center ui-gap-4 ui-p-8">
      <h1 className="ui-text-3xl ui-font-bold ui-uppercase ui-tracking-tighter ui-text-black dark:ui-text-white">
        Uh oh.
      </h1>
      <h2 className="ui-tracking-tight ui-text-black dark:ui-text-white">
        Something went wrong.
      </h2>
      {message && (
        <p className="ui-tracking-tight ui-text-zinc-400 dark:ui-text-zinc-700">
          {message}
        </p>
      )}
      <Button
        structure="outlined"
        fullWidth={true}
        onClick={() => {
          onClose();
          setAbstraxionError("");
        }}
      >
        Dismiss
      </Button>
    </div>
  );
};
