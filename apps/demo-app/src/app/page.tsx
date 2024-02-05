"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Abstraxion,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/styles.css";
import type { ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { seatContractAddress } from "./layout";

type ExecuteResultOrUndefined = ExecuteResult | undefined;
export default function Page(): JSX.Element {
  // console.log("hello");
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  // General state hooks
  const [, setShowModal]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ] = useModal();
  const [loading, setLoading] = useState(false);
  const [executeResult, setExecuteResult] =
    useState<ExecuteResultOrUndefined>(undefined);

  const blockExplorerUrl = `https://explorer.burnt.com/xion-testnet-1/tx/${executeResult?.transactionHash}`;

  function getTimestampInSeconds(date: Date | null): number {
    if (!date) return 0;
    const d = new Date(date);
    return Math.floor(d.getTime() / 1000);
  }

  const now = new Date();
  now.setSeconds(now.getSeconds() + 15);
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  async function claimSeat(): Promise<void> {
    setLoading(true);
    const msg = {
      sales: {
        claim_item: {
          token_id: String(getTimestampInSeconds(now)),
          owner: account.bech32Address,
          token_uri: "",
          extension: {},
        },
      },
    };

    try {
      const claimRes = await client?.execute(
        account.bech32Address,
        seatContractAddress,
        msg,
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
        "",
        [],
      );

      setExecuteResult(claimRes);
    } catch (error) {
      // eslint-disable-next-line no-console -- No UI exists yet to display errors
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="m-auto flex min-h-screen max-w-xs flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        ABSTRAXION
      </h1>
      <Button
        fullWidth
        onClick={() => {
          setShowModal(true);
        }}
        structure="base"
      >
        {account.bech32Address ? (
          <div className="flex items-center justify-center">VIEW ACCOUNT</div>
        ) : (
          "CONNECT"
        )}
      </Button>
      {client ? (
        <Button
          disabled={loading}
          fullWidth
          onClick={() => {
            void claimSeat();
          }}
          structure="base"
        >
          {loading ? "LOADING..." : "CLAIM SEAT"}
        </Button>
      ) : null}
      <Abstraxion
        onClose={() => {
          setShowModal(false);
        }}
      />
      {executeResult ? (
        <div className="flex flex-col rounded border-2 border-black p-2 dark:border-white">
          <div className="mt-2">
            <p className="text-zinc-500">
              <span className="font-bold">Transaction Hash</span>
            </p>
            <p className="text-sm">{executeResult.transactionHash}</p>
          </div>
          <div className="mt-2">
            <p className=" text-zinc-500">
              <span className="font-bold">Block Height:</span>
            </p>
            <p className="text-sm">{executeResult.height}</p>
          </div>
          <div className="mt-2">
            <Link
              className="text-black underline visited:text-purple-600 dark:text-white"
              href={blockExplorerUrl}
              target="_blank"
            >
              View in Block Explorer
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
