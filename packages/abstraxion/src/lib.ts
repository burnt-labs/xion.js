import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createStytchHeadlessClient } from "@stytch/nextjs/headless";
import { StytchHeadlessClient } from "@stytch/vanilla-js/dist/index.headless";

// TODO: Temporarily hard-coded
export const stytchClient: StytchHeadlessClient = createStytchHeadlessClient(
  "public-token-live-59266a62-2720-4452-8984-b65cd54c8838",
);

// TODO: Refactor to be dynamic. Local dev uri must be device IP.
export const apolloClient = new ApolloClient({
  uri: "https://api.subquery.network/sq/burnt-labs/xion-indexer",
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
});
