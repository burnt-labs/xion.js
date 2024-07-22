import { Button, Spinner } from "@burnt-labs/ui";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "../../hooks";
import { useContext, useState } from "react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";

type AbstraxionMigrateProps = {
  updateContractCodeID: () => Promise<void>;
};

export const AbstraxionMigrate = ({
  updateContractCodeID,
}: AbstraxionMigrateProps) => {
  const { setAbstraxionError } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const { client } = useAbstraxionSigningClient();
  const { data: account } = useAbstraxionAccount();
  const [inProgress, setInProgress] = useState(false);
  const [failed, setFailed] = useState(false);

  const migrateAccount = async () => {
    if (!client) return;
    try {
      setInProgress(true);

      await client.migrate(
        account.id,
        account.id,
        793,
        {},
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
      );

      void updateContractCodeID();
    } catch (error) {
      console.log("something went wrong: ", error);
      setFailed(true);
    } finally {
      setInProgress(false);
    }
  };

  if (failed) {
    setAbstraxionError("Failed to migrate account.");
    return null;
  }

  if (inProgress) {
    return (
      <div className="ui-w-full ui-h-full ui-min-h-[500px] ui-flex ui-items-center ui-justify-center ui-text-white">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="ui-flex ui-h-full ui-w-full ui-flex-col ui-items-start ui-justify-between ui-gap-8 sm:ui-p-10 ui-text-white">
      <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
        <h1 className="ui-text-3xl ui-font-thin ui-uppercase ui-tracking-tighter ui-text-white ui-text-center">
          Congratulations!
        </h1>
        <p className="ui-tracking-tight ui-text-zinc-400 ui-text-center">
          Your account is due for an upgrade! Please click below to begin the
          process.
        </p>
      </div>
      <div className="ui-w-full ui-flex ui-flex-col ui-gap-4">
        <Button structure="base" fullWidth={true} onClick={migrateAccount}>
          Migrate Account
        </Button>
      </div>
    </div>
  );
};
