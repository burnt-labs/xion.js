import { ModalSection, Spinner } from "@burnt-labs/ui";

export const Loading = () => {
  return (
    <ModalSection>
      <div className="ui-flex ui-h-full ui-w-full ui-items-center ui-justify-center ui-text-white">
        <Spinner />
      </div>
    </ModalSection>
  );
};
