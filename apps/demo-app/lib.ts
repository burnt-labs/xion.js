import { ApolloClient, InMemoryCache } from "@apollo/client";

const DEFAULT_INDEXER_URL =
  "https://api.subquery.network/sq/burnt-labs/xion-indexer-webauthn";

export const apolloClient = new ApolloClient({
  uri: DEFAULT_INDEXER_URL,
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
});
