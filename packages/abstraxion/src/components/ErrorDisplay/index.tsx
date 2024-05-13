import { Button } from "@burnt-labs/ui";

export function ErrorDisplay() {
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
        structure="naked"
        fullWidth={true}
        onClick={() => {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("granted");
          currentUrl.searchParams.delete("granter");
          history.pushState({}, "", currentUrl.href);
          window.location.reload();
        }}
      >
        Refresh the page
      </Button>
    </div>
  );
}
