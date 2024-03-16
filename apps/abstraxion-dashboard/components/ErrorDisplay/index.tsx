import { useContext } from "react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { Button } from "@burnt-labs/ui";

export const ErrorDisplay = ({
  title = "OOPS! Something went wrong...",
  message = "Please try again later.",
  onClose,
}: {
  title?: string;
  message?: string;
  onClose: VoidFunction;
}) => {
  const { setAbstraxionError } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  return (
    <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-center ui-justify-center ui-gap-4 ui-p-8 ui-font-akkuratLL">
      <h1 className="ui-text-3xl ui-font-thin ui-uppercase ui-tracking-tighter ui-text-white">
        {title}
      </h1>
      <p className="ui-tracking-tight ui-text-zinc-400 dark:ui-text-zinc-700">
        {message}
      </p>
      <Button
        fullWidth={true}
        onClick={() => {
          onClose();
          setAbstraxionError("");
        }}
      >
        Close
      </Button>
    </div>
  );
};
