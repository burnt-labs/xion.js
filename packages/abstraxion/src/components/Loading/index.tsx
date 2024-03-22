import { ModalSection, Spinner } from "@burnt-labs/ui";

export function Loading(): JSX.Element {
  return (
    <ModalSection>
      <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
        <h1 className="ui-w-full ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
          Connecting...
        </h1>
        <h2 className="ui-w-full ui-tracking-tighter ui-text-sm ui-mb-4 ui-text-neutral-500">
          Signing you in... Don’t close the window.
        </h2>
      </div>
      <div className="ui-flex ui-h-full ui-w-full ui-items-center ui-justify-center ui-text-white">
        <Spinner />
      </div>
    </ModalSection>
  );
};
