"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Abstraxion,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/styles.css";
import type { InstantiateResult } from "@cosmjs/cosmwasm-stargate";

type InitiateResultOrUndefined = InstantiateResult | undefined;
export default function Page(): JSX.Element {
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  // General state hooks
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initiateResult, setInitiateResult] =
    useState<InitiateResultOrUndefined>(undefined);

  const blockExplorerUrl = `https://explorer.burnt.com/xion-testnet-1/tx/${initiateResult?.transactionHash}`;

  const instantiateTestContract = async (): Promise<void> => {
    setLoading(true);
    try {
      if (!client) {
        setIsOpen(true);
        return;
      }
      const initMsg = {
        metadata: {
          metadata: {
            name: "Abstraxion House",
            hub_url: "abstraxion_house",
            description: "Generalized Abstraction",
            tags: [],
            social_links: [],
            creator: account?.bech32Address,
            thumbnail_image_url: "https://fakeimg.pl/200/",
            banner_image_url: "https://fakeimg.pl/500/",
          },
        },
        ownable: {
          owner: account?.bech32Address,
        },
      };

      const hubResult = await client.instantiate(
        account?.bech32Address || "",
        1,
        initMsg,
        "my-hub",
        {
          amount: [{ amount: "0", denom: "uxion" }],
          gas: "500000",
        },
      );
      setInitiateResult(hubResult);
    } catch (error) {
      // eslint-disable-next-line no-console -- No UI exists yet to display errors
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!account) {
      setInitiateResult(undefined);
    }
  }, [account]);

  return (
    <main className="m-auto flex min-h-screen max-w-xs flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        ABSTRAXION
      </h1>
      <Button
        fullWidth
        onClick={() => {
          setIsOpen(true);
        }}
        structure="base"
      >
        {account ? (
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
            void instantiateTestContract();
          }}
          structure="base"
        >
          {loading ? "LOADING..." : "INSTANTIATE TEST CONTRACT"}
        </Button>
      ) : null}
      <Abstraxion
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />
      {initiateResult ? (
        <div className="flex flex-col rounded border-2 border-black p-2 dark:border-white">
          <div className="mt-2">
            <p className="text-zinc-500">
              <span className="font-bold">Contract Address:</span>
            </p>
            <p className="text-sm">{initiateResult.contractAddress}</p>
          </div>
          <div className="mt-2">
            <p className=" text-zinc-500">
              <span className="font-bold">Block Height:</span>
            </p>
            <p className="text-sm">{initiateResult.height}</p>
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
