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
import "@burnt-labs/ui/dist/index.css";
import type { InstantiateResult } from "@cosmjs/cosmwasm-stargate";
import { SignArb } from "../components/sign-arb.tsx";

type InstantiateResultOrUndefined = InstantiateResult | undefined;

export default function Page(): JSX.Element {
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client, signArb, logout } = useAbstraxionSigningClient();

  // General state hooks
  const [, setShowModal]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ] = useModal();
  const [loading, setLoading] = useState(false);
  const [instantiateResult, setInstantiateResult] =
    useState<InstantiateResultOrUndefined>(undefined);

  const blockExplorerUrl = `https://explorer.burnt.com/xion-testnet-1/tx/${instantiateResult?.transactionHash}`;

  async function claimSeat(): Promise<void> {
    setLoading(true);

    try {
      // Use "auto" fee for most transactions
      // Sample treasury contract instantiate msg
      const msg = {
        type_urls: ["/cosmwasm.wasm.v1.MsgInstantiateContract"],
        grant_configs: [
          {
            description: "Ability to instantiate contracts",
            optional: false,
            authorization: {
              type_url: "/cosmos.authz.v1beta1.GenericAuthorization",
              value: "CigvY29zbXdhc20ud2FzbS52MS5Nc2dJbnN0YW50aWF0ZUNvbnRyYWN0",
            },
          },
        ],
        fee_config: {
          description: "Sample fee config for testnet-2",
          allowance: {
            type_url: "/cosmos.feegrant.v1beta1.BasicAllowance",
            value: "Cg8KBXV4aW9uEgY1MDAwMDA=",
          },
        },
        admin: account.bech32Address,
      };

      const instantiateRes = await client?.instantiate(
        account.bech32Address,
        33,
        msg,
        "instantiate on expo demo",
        "auto",
      );

      console.log(instantiateRes);

      if (!instantiateRes) {
        throw new Error("Instantiate failed.");
      }

      // Default cosmsjs gas multiplier for simulation is 1.4
      // If you're finding that transactions are undersimulating, you can bump up the gas multiplier by setting fee to a number, ex. 1.5
      // Fee amounts shouldn't stray too far away from the defaults
      // Example:
      // const instantiateRes = await client?.instantiate(
      //   account.bech32Address,
      //   33,
      //   msg,
      //   "instantiate on expo demo",
      //   1.5
      // );

      setInstantiateResult(instantiateRes);
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
        <>
          <Button
            disabled={loading}
            fullWidth
            onClick={() => {
              void claimSeat();
            }}
            structure="base"
          >
            {loading ? "LOADING..." : "Instantiate Sample Treasury"}
          </Button>
          {logout ? (
            <Button
              disabled={loading}
              fullWidth
              onClick={() => {
                logout();
              }}
              structure="base"
            >
              LOGOUT
            </Button>
          ) : null}
          {signArb ? <SignArb /> : null}
        </>
      ) : null}
      <Abstraxion
        onClose={() => {
          setShowModal(false);
        }}
      />
      {instantiateResult ? (
        <div className="flex flex-col rounded border-2 border-black p-2 dark:border-white">
          <div className="mt-2">
            <p className="text-zinc-500">
              <span className="font-bold">Transaction Hash</span>
            </p>
            <p className="text-sm">{instantiateResult.transactionHash}</p>
          </div>
          <div className="mt-2">
            <p className=" text-zinc-500">
              <span className="font-bold">Block Height:</span>
            </p>
            <p className="text-sm">{instantiateResult.height}</p>
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
