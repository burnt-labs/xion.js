import { ModalSection, Spinner } from "@burnt-labs/ui";

export const Loading = () => {
  return (
    <ModalSection>
      <div className="ui-text-black dark:ui-text-white">
        <h1 className="ui-mb-3 ui-text-2xl ui-font-bold ui-tracking-tighter">
          Let's Go
        </h1>
        <h2 className="ui-mb-3">Starting your journey</h2>
      </div>
      <div className="ui-flex ui-h-full ui-w-full ui-items-center ui-justify-center ui-text-black dark:ui-text-white">
        <Spinner />
      </div>
    </ModalSection>
  );
};
