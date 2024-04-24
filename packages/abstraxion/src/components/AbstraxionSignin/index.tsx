"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { BrowserIcon, Button, ModalSection } from "@burnt-labs/ui";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import {
  AbstraxionContext,
  ContractGrantDescription,
} from "../AbstraxionContext";
import { fetchConfig } from "@burnt-labs/constants";

interface GrantsResponse {
  grants: Grant[];
  pagination: Pagination;
}

interface Grant {
  granter: string;
  grantee: string;
  authorization: Authorization;
  expiration: string;
}

interface Authorization {
  "@type": string;
  grants: GrantAuthorization[];
}

interface GrantAuthorization {
  contract: string;
  limit: Limit;
  filter: Filter;
}

interface Limit {
  "@type": string;
  remaining: string;
}

interface Filter {
  "@type": string;
}

interface Pagination {
  next_key: null | string;
  total: string;
}

export function AbstraxionSignin(): JSX.Element {
  const {
    setIsConnecting,
    setIsConnected,
    setAbstraxionError,
    setAbstraxionAccount,
    setGranterAddress,
    granterAddress,
    contracts,
    dashboardUrl,
    setDashboardUrl,
    rpcUrl,
    restUrl,
    stake,
    bank,
  } = useContext(AbstraxionContext);

  const isMounted = useRef(false);
  const [tempAccountAddress, setTempAccountAddress] = useState("");

  function configuregranter(address: string) {
    setGranterAddress(address);
    localStorage.setItem("xion-authz-granter-account", address);
  }

  function openDashboardTab(
    userAddress: string,
    grantContracts?: ContractGrantDescription[],
    dashUrl?: string,
  ): void {
    if (!dashUrl) {
      console.warn("Failed to fetch dashboard url");
      setAbstraxionError("Failed to fetch dashboard url");
    }
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams();

    if (bank) {
      urlParams.set("bank", JSON.stringify(bank));
    }

    if (stake) {
      urlParams.set("stake", "true");
    }
    urlParams.set("grantee", userAddress);
    if (grantContracts) {
      urlParams.set("contracts", JSON.stringify(grantContracts));
    }
    urlParams.set("redirect_uri", currentUrl);
    const queryString = urlParams.toString(); // Convert URLSearchParams to string
    window.location.href = `${dashUrl}?${queryString}`;
  }

  async function generateAndStoreTempAccount(): Promise<DirectSecp256k1HdWallet> {
    const keypair = await DirectSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });
    // TODO: serialization password and localStorage key
    const serializedKeypair = await keypair.serialize("abstraxion");
    localStorage.setItem("xion-authz-temp-account", serializedKeypair);
    return keypair;
  }

  async function pollForGrants(
    grantee: string,
    granter: string | null,
  ): Promise<void> {
    if (!grantee) {
      throw new Error("No keypair address");
    }
    if (!granter) {
      throw new Error("No granter address");
    }

    setIsConnecting(true);

    const baseUrl = `${restUrl}/cosmos/authz/v1beta1/grants`;
    const url = new URL(baseUrl);
    const params = new URLSearchParams({
      grantee,
      granter,
    });
    url.search = params.toString();

    const shouldContinue = true;
    while (shouldContinue) {
      try {
        const res = await fetch(url, {
          cache: "no-store",
        });
        const data = (await res.json()) as GrantsResponse;
        if (data.grants.length > 0) {
          configuregranter(granter);
          // Remove query parameter "granted" and "granter"
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("granted");
          currentUrl.searchParams.delete("granter");
          history.pushState({}, "", currentUrl.href);

          break;
        }
      } catch (error) {
        throw error;
      }
    }
  }

  useEffect(() => {
    async function onStartup() {
      try {
        const existingKeypair = localStorage.getItem("xion-authz-temp-account");
        let keypair;
        if (existingKeypair) {
          keypair = await DirectSecp256k1HdWallet.deserialize(
            existingKeypair,
            "abstraxion",
          );
        } else {
          keypair = await generateAndStoreTempAccount();
        }
        const searchParams = new URLSearchParams(window.location.search);
        const isGranted = searchParams.get("granted");
        const granter = searchParams.get("granter");
        const accounts = await keypair.getAccounts();
        const address = accounts[0].address;
        setTempAccountAddress(address);

        if (!isGranted && !granterAddress) {
          const { dashboardUrl } = await fetchConfig(rpcUrl);
          setDashboardUrl(dashboardUrl);
          openDashboardTab(address, contracts, dashboardUrl);
        } else if (isGranted && !granterAddress) {
          await pollForGrants(address, granter);
          setIsConnecting(false);
          setIsConnected(true);
          setAbstraxionAccount(keypair);
        } else {
          setIsConnected(true);
        }
      } catch (error) {
        console.log("Something went wrong: ", error);
        setAbstraxionError((error as Error).message);
      }
    }

    if (!isMounted.current) {
      onStartup();
    }

    isMounted.current = true;
  }, []);

  return (
    <ModalSection className="ui-items-center">
      <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
        <h1 className="ui-w-full ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
          Secure account creation
        </h1>
        <h2 className="ui-w-full ui-tracking-tighter ui-text-sm ui-mb-4 ui-text-neutral-500">
          Please switch to the newly opened tab and enter your credentials to
          securely complete your account creation
        </h2>
      </div>
      <BrowserIcon />
      <Button
        onClick={() => {
          openDashboardTab(tempAccountAddress, contracts, dashboardUrl);
        }}
        structure="naked"
      >
        Have a Problem? Try Again
      </Button>
    </ModalSection>
  );
}
