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

/**
 * Queries two indexers and combines the results into a single response.
 * This hook handles the loading, error, and data states for the combined query.
 *
 * @param {string} loginAuthenticator - The authenticator token used in the query variables.
 * @returns {CombinedQueryResponse} - An object containing the loading status, error message (if any), combined data, previous data, and dummy polling functions.
 * @throws {Error} - Throws an error if both indexer queries fail.
 */
export const useCombinedQuery = (
  loginAuthenticator: string,
): CombinedQueryResponse => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [data, setData] = useState<SmartAccountNodes[] | undefined>();
  const [previousData, setPreviousData] = useState<
    SmartAccountNodes[] | undefined
  >();

  const fetchFromBothIndexersRef = useRef<() => void>();
  const retryCountRef = useRef(0);
  const MAX_ATTEMPTS = 5;

  const fetchFromBothIndexers = useCallback(async () => {
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

      if (combinedData.length === 0 && retryCountRef.current < MAX_ATTEMPTS) {
        throw new Error("No data fetched");
      }

      if (data) {
        setPreviousData(data);
      }

      setData(combinedData);
      setLoading(false);
      retryCountRef.current = 0;
    } catch (error) {
      if (retryCountRef.current < MAX_ATTEMPTS) {
        const retryDelay = Math.pow(2, retryCountRef.current) * 1000;
        retryCountRef.current += 1;
        setTimeout(fetchFromBothIndexers, retryDelay);
      } else {
        setError(error);
        setLoading(false);
      }
    }
  }, [loginAuthenticator, data]);

  fetchFromBothIndexersRef.current = fetchFromBothIndexers;

  useEffect(() => {
    fetchFromBothIndexers();
  }, [loginAuthenticator]);

  return {
    loading,
    error,
    data,
    previousData,
    refetch: fetchFromBothIndexers,
  };
};
