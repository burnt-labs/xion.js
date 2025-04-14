"use client";
import { useState } from "react";
import {
  Abstraxion,
  abstraxionAuth,
  DecodeAuthorizationResponse,
  Grant,
  GrantsResponse,
  TreasuryGrantConfig,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import Link from "next/link";

export default function DebugGrantsPage(): JSX.Element {
  // Abstraxion hooks
  const { data: account } = useAbstraxionAccount();
  const { client, signArb, logout } = useAbstraxionSigningClient();

  // General state hooks
  const [, setShowModal] = useModal();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Input state
  const [treasury, setTreasury] = useState<string>("");
  const [grantee, setGrantee] = useState<string>("");
  const [granter, setGranter] = useState<string>("");

  // Grants state
  const [chainGrants, setChainGrants] = useState<Grant[]>([]);
  const [treasuryGrantConfigs, setTreasuryGrantConfigs] = useState<
    TreasuryGrantConfig[]
  >([]);
  const [decodedTreasuryGrants, setDecodedTreasuryGrants] = useState<
    (DecodeAuthorizationResponse | null)[]
  >([]);

  async function compareGrants(): Promise<void> {
    setLoading(true);
    setResult(null);
    setError(null);

    // Reset grants state
    setChainGrants([]);
    setTreasuryGrantConfigs([]);
    setDecodedTreasuryGrants([]);

    try {
      if (!treasury) {
        throw new Error("Treasury address is required");
      }

      if (!grantee || !granter) {
        throw new Error("Grantee and granter addresses are required");
      }

      // Configure the RPC URL and treasury
      const rpcUrl = "https://rpc.xion-testnet-2.burnt.com";
      const restUrl = "https://api.xion-testnet-2.burnt.com";
      abstraxionAuth.configureAbstraxionInstance(
        rpcUrl,
        restUrl,
        undefined,
        undefined,
        undefined,
        undefined,
        treasury,
      );

      // Fetch grants using the AbstraxionAuth instance
      let grantsResponse: GrantsResponse;
      try {
        grantsResponse = await abstraxionAuth.fetchGrants(
          grantee,
          granter,
          restUrl,
        );

        // Save chain grants
        setChainGrants(grantsResponse.grants);
      } catch (fetchError) {
        console.error("Error fetching grants:", fetchError);
        throw new Error(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch grants",
        );
      }

      // Get CosmWasmClient from AbstraxionAuth and query treasury grant configurations
      try {
        const cosmwasmClient = await abstraxionAuth.getCosmWasmClient();

        // Query treasury for grant configurations
        const queryTreasuryContractMsg = { grant_config_type_urls: {} };
        const treasuryGrantUrlsResponse: string[] =
          await cosmwasmClient.queryContractSmart(
            treasury,
            queryTreasuryContractMsg,
          );

        // Fetch each grant configuration
        const configs: TreasuryGrantConfig[] = [];
        const decodedConfigs: (DecodeAuthorizationResponse | null)[] = [];

        for (const typeUrl of treasuryGrantUrlsResponse) {
          const queryByMsg = {
            grant_config_by_type_url: { msg_type_url: typeUrl },
          };
          const grantConfigResponse: TreasuryGrantConfig =
            await cosmwasmClient.queryContractSmart(treasury, queryByMsg);

          configs.push(grantConfigResponse);

          // Decode the authorization
          const decodedAuth = abstraxionAuth.decodeAuthorization(
            grantConfigResponse.authorization.type_url,
            grantConfigResponse.authorization.value,
          );

          decodedConfigs.push(decodedAuth);
        }

        // Save treasury grant configurations and decoded authorizations
        setTreasuryGrantConfigs(configs);
        setDecodedTreasuryGrants(decodedConfigs);
      } catch (treasuryError) {
        console.error(
          "Error fetching treasury grant configurations:",
          treasuryError,
        );
        throw new Error(
          treasuryError instanceof Error
            ? `Failed to fetch treasury grant configurations: ${treasuryError.message}`
            : "Failed to fetch treasury grant configurations",
        );
      }

      // Compare grants to treasury
      const comparisonResult =
        await abstraxionAuth.compareGrantsToTreasury(grantsResponse);

      setResult(comparisonResult);
    } catch (error) {
      console.error("Error comparing grants:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="m-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Debug Grants Comparison
      </h1>

      <div className="w-full">
        <Link href="/" className="mb-4 block text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <div className="w-full space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-white">Treasury Address</label>
          <input
            type="text"
            value={treasury}
            onChange={(e) => setTreasury(e.target.value)}
            placeholder="Enter treasury address"
            className="rounded border border-gray-300 p-2 text-black"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-white">Grantee Address</label>
          <input
            type="text"
            value={grantee}
            onChange={(e) => setGrantee(e.target.value)}
            placeholder="Enter grantee address"
            className="rounded border border-gray-300 p-2 text-black"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-white">Granter Address</label>
          <input
            type="text"
            value={granter}
            onChange={(e) => setGranter(e.target.value)}
            placeholder="Enter granter address"
            className="rounded border border-gray-300 p-2 text-black"
          />
        </div>

        <Button
          disabled={loading || !treasury || !grantee || !granter}
          fullWidth
          onClick={() => {
            void compareGrants();
          }}
          structure="base"
        >
          {loading ? "LOADING..." : "Compare Grants to Treasury"}
        </Button>

        {result !== null && (
          <div
            className={`rounded p-4 ${result ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            <p className="font-bold">Comparison Result:</p>
            <p>
              {result
                ? "Grants match the treasury configuration"
                : "Grants do not match the treasury configuration"}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded bg-red-100 p-4 text-red-800">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Display Chain Grants */}
        {chainGrants.length > 0 && (
          <div className="mt-4 rounded border border-gray-300 p-4">
            <h2 className="mb-2 text-lg font-bold text-white">
              Actual Grants (from Chain)
            </h2>
            <div className="max-h-60 overflow-y-auto">
              {chainGrants.map((grant, index) => (
                <div
                  key={index}
                  className="mb-2 rounded bg-gray-700 p-2 text-white"
                >
                  <p>
                    <span className="font-bold">Type:</span>{" "}
                    {grant.authorization["@type"]}
                  </p>
                  <p>
                    <span className="font-bold">Expiration:</span>{" "}
                    {grant.expiration}
                  </p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-blue-400">
                      Authorization Details
                    </summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(grant.authorization, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display Treasury Grant Configurations */}
        {treasuryGrantConfigs.length > 0 && (
          <div className="mt-4 rounded border border-gray-300 p-4">
            <h2 className="mb-2 text-lg font-bold text-white">
              Expected Grants (from Treasury)
            </h2>
            <div className="max-h-60 overflow-y-auto">
              {treasuryGrantConfigs.map((config, index) => (
                <div
                  key={index}
                  className="mb-2 rounded bg-gray-700 p-2 text-white"
                >
                  <p>
                    <span className="font-bold">Description:</span>{" "}
                    {config.description}
                  </p>
                  <p>
                    <span className="font-bold">Type:</span>{" "}
                    {config.authorization.type_url}
                  </p>
                  <p>
                    <span className="font-bold">Optional:</span>{" "}
                    {config.optional ? "Yes" : "No"}
                  </p>

                  {decodedTreasuryGrants[index] && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-blue-400">
                        Decoded Authorization
                      </summary>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(decodedTreasuryGrants[index], null, 2)}
                      </pre>
                    </details>
                  )}

                  <details className="mt-1">
                    <summary className="cursor-pointer text-blue-400">
                      Raw Authorization
                    </summary>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(config.authorization, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional login button */}
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
            "CONNECT (OPTIONAL)"
          )}
        </Button>

        {logout && account.bech32Address ? (
          <Button
            fullWidth
            onClick={() => {
              logout();
            }}
            structure="base"
          >
            LOGOUT
          </Button>
        ) : null}
      </div>

      <Abstraxion
        onClose={() => {
          setShowModal(false);
        }}
      />
    </main>
  );
}
