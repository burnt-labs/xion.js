import { useCallback, useEffect, useRef, useState } from "react";
import { apolloClient, tempNewApolloClient } from "../lib";
import { AllSmartWalletQuery } from "../utils/queries";

interface CombinedQueryResponse {
  loading: boolean;
  error?: Error;
  data?: SmartAccountNodes[];
  previousData?: any[];
  refetch: () => void;
}

interface SmartAccountNodes {
  _typename: string;
  id: string;
  authenticators: SmartAccountAuthenticators;
}

interface SmartAccountAuthenticators {
  _typename: string;
  nodes: SmartAccountAuthenticatorNodes[];
}

interface SmartAccountAuthenticatorNodes {
  _typename: string;
  authenticator: string;
  authenticatorIndex: number;
  id: string;
  type: string;
  version: string;
}
const MAX_ATTEMPTS = 10;

/**
 * Queries two indexers and combines the results into a single response.
 * This hook handles the loading, error, and data states for the combined query.
 *
 * @param {string} loginAuthenticator - The authenticator token used in the query variables.
 * @param {function} onNewData - Callback function to be called when new data is fetched.
 * @returns {CombinedQueryResponse} - An object containing the loading status, error message (if any), combined data, previous data, and dummy polling functions.
 * @throws {Error} - Throws an error if both indexer queries fail.
 */
export const useCombinedQuery = (
  loginAuthenticator: string,
  onNewData?: (newData: SmartAccountNodes[]) => void,
): CombinedQueryResponse => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [data, setData] = useState<SmartAccountNodes[] | undefined>();
  const [previousData, setPreviousData] = useState<
    SmartAccountNodes[] | undefined
  >();

  const retryCountRef = useRef(0);

  const fetchFromBothIndexers = useCallback(
    async (isRefetch: boolean = false) => {
      setLoading(true);
      try {
        const [oldIndexerResult, newIndexerResult] = await Promise.all([
          apolloClient.query({
            query: AllSmartWalletQuery,
            variables: { authenticator: loginAuthenticator },
            fetchPolicy: "network-only",
          }),
          tempNewApolloClient.query({
            query: AllSmartWalletQuery,
            variables: { authenticator: loginAuthenticator },
            fetchPolicy: "network-only",
          }),
        ]);

        const oldIndexerData: SmartAccountNodes[] =
          oldIndexerResult.data.smartAccounts.nodes;
        const newIndexerData: SmartAccountNodes[] =
          newIndexerResult.data.smartAccounts.nodes;

        const combinedData = [...oldIndexerData, ...newIndexerData];

        if (
          combinedData.length === 0 &&
          isRefetch &&
          retryCountRef.current < MAX_ATTEMPTS
        ) {
          throw new Error("No data fetched");
        }

        const isNewData =
          data && previousData
            ? JSON.stringify(combinedData) !== JSON.stringify(previousData)
            : false;

        if (isRefetch && !isNewData && retryCountRef.current < MAX_ATTEMPTS) {
          throw new Error("Stale data");
        }

        if (isRefetch) {
          setPreviousData(data);
        }
        setData(combinedData);
        setLoading(false);
        retryCountRef.current = 0;

        if (isRefetch && onNewData) {
          onNewData(combinedData);
        }
      } catch (err) {
        if (isRefetch && retryCountRef.current < MAX_ATTEMPTS) {
          retryCountRef.current += 1;
          setTimeout(() => fetchFromBothIndexers(true), 1000);
        } else {
          setError(err);
          setLoading(false);
        }
      }
    },
    [loginAuthenticator, data, previousData, onNewData],
  );

  useEffect(() => {
    fetchFromBothIndexers(false);
  }, [loginAuthenticator]);

  return {
    loading,
    error,
    data,
    previousData,
    refetch: () => fetchFromBothIndexers(true),
  };
};
