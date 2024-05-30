import { useContext } from "react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { Button } from "@burnt-labs/ui";

export const ErrorDisplay = ({
  title = "OOPS! Something went wrong...",
  message = "Please try refreshing the page. If the problem continues, check your internet connection or try again later.",
  buttonTitle = "Refresh the Page",
  onClick,
}: {
  title?: string;
  message?: string;
  onClick?: VoidFunction;
  buttonTitle?: string;
}) => {
  const { setAbstraxionError } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const refreshPage = () => window.location.reload();

  return (
    <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-center ui-justify-center ui-gap-4 ui-p-8 ui-font-akkuratLL">
      <h1 className="ui-text-3xl ui-font-thin ui-uppercase ui-tracking-tighter ui-text-white ui-text-center">
        {title}
      </h1>
      <p className="ui-tracking-tight ui-text-zinc-400 ui-text-center">
        {message}
      </p>
      <Button
        fullWidth={true}
        structure="naked"
        onClick={() => {
          if (onClick) {
            onClick();
          } else {
            refreshPage();
          }
          setAbstraxionError("");
        }}
      >
        {buttonTitle}
      </Button>
    </div>
  );
};
