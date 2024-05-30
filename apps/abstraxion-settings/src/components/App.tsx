import { Dialog, DialogContent } from "@burnt-labs/ui";
import { useQueryParams } from "../hooks/useQueryParams";
import { Abstraxion } from "./Abstraxion";
import { ErrorDisplay } from "./ErrorDisplay";

export function App() {
  const { contracts, stake, bank, grantee } = useQueryParams([
    "contracts",
    "stake",
    "bank",
    "grantee",
  ]);

  return grantee && (contracts || stake || bank) ? (
    <div className="ui-flex ui-h-screen ui-flex-1 ui-items-center ui-justify-center ui-overflow-y-auto ui-p-6">
      <Abstraxion onClose={() => null} isOpen={true} />
    </div>
  ) : (
    <Dialog open={true}>
      <DialogContent>
        <ErrorDisplay />
      </DialogContent>
    </Dialog>
  );
}
