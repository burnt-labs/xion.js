import { Button } from "@burnt-labs/ui";

export function ErrorDisplay(): JSX.Element {
  return (
    <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-start ui-justify-center ui-gap-4 ui-p-8 ui-text-center">
      <h1 className="ui-text-3xl ui-font-bold ui-uppercase ui-tracking-tighter ui-text-white">
        Oops! Something went wrong...
      </h1>
      <h2 className="ui-tracking-tight ui-text-neutral-500">
        Please try refreshing the page. If the problem continues, check your
        internet connection or try again later.
      </h2>
      <Button
        fullWidth
        onClick={() => {
          window.location.reload();
        }}
        structure="naked"
      >
        Refresh the page
      </Button>
    </div>
  );
}
