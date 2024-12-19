"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Abstraxion,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import type { ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { SignArb } from "../components/sign-arb.tsx";
import NftList from "../components/NftList.tsx";

const seatContractAddress =
  "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

const soulboundNftContractAddress =
  "xion1rcdjfs8f0dqrfyep28m6rgfuw5ue2y788lk5jsj0ll5f2jekh6yqm95y32";

type ExecuteResultOrUndefined = ExecuteResult | undefined;

export default function Page(): JSX.Element {
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client, signArb, logout } = useAbstraxionSigningClient();
  const [nfts, setNfts] = useState([]);

  // General state hooks
  const [, setShowModal]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
  ] = useModal();
  const [loading, setLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [executeResult, setExecuteResult] =
    useState<ExecuteResultOrUndefined>(undefined);

  const blockExplorerUrl = `https://explorer.burnt.com/xion-testnet-1/tx/${executeResult?.transactionHash}`;

  useEffect(() => {
    if (account.bech32Address) {
      void fetchNfts(account.bech32Address);
    }
  }, [account.bech32Address, client]);

  function getTimestampInSeconds(date: Date | null): number {
    if (!date) return 0;
    const d = new Date(date);
    return Math.floor(d.getTime() / 1000);
  }

  const now = new Date();
  now.setSeconds(now.getSeconds() + 15);
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  async function fetchNfts(owner: string): Promise<void> {
    if (!client || !owner) return;
    setLoading(true);
    try {
      const result = await client.queryContractSmart(
        soulboundNftContractAddress,
        {
          tokens: { owner, start_after: null, limit: 100 },
        },
      );
      setNfts(result.tokens || []);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMint() {
    if (!account.bech32Address) return;
    setIsMinting(true);
    setLoading(true);
    try {
      const response = await fetch("/api/mint-soulbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.bech32Address }),
      });
      const data = await response.json();

      if (data.txHash) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await fetchNfts(account.bech32Address);
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
    } finally {
      setIsMinting(false);
      setLoading(false);
    }
  }

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
      // Use "auto" fee for most transactions
      const claimRes = await client?.execute(
        account.bech32Address,
        seatContractAddress,
        msg,
        "auto",
      );

      // Default cosmsjs gas multiplier for simulation is 1.4
      // If you're finding that transactions are undersimulating, you can bump up the gas multiplier by setting fee to a number, ex. 1.5
      // Fee amounts shouldn't stray too far away from the defaults
      // Example:
      // const claimRes = await client?.execute(
      //   account.bech32Address,
      //   seatContractAddress,
      //   msg,
      //   1.5,
      // );

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
        <>
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
          <NftList nfts={nfts} />
          <Button
            onClick={handleMint}
            fullWidth
            disabled={isMinting || loading}
          >
            {loading ? "MINTING..." : "MINT NFT"}
          </Button>
        </>
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
