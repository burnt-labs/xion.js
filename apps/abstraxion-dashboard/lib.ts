import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createStytchHeadlessClient } from "@stytch/nextjs/headless";
import { StytchHeadlessClient } from "@stytch/vanilla-js/dist/index.headless";

// TODO: Temporarily hard-coded - ENV VAR so deployments can configure
export const stytchClient: StytchHeadlessClient = createStytchHeadlessClient(
  "public-token-live-87901ec3-ef19-48ca-b3f4-842be750181b",
);

// TODO: Refactor to be dynamic. Local dev uri must be device IP.
export const apolloClient = new ApolloClient({
  uri: "https://api.subquery.network/sq/burnt-labs/xion-indexer",
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
});
