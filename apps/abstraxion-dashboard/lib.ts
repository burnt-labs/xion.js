import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createStytchHeadlessClient } from "@stytch/nextjs/headless";
import { StytchHeadlessClient } from "@stytch/vanilla-js/dist/index.headless";

// TODO: Temporarily hard-coded
export const stytchClient: StytchHeadlessClient = createStytchHeadlessClient(
  "public-token-test-317adb7b-a52d-4e45-8c2a-d7dab1ef10a0",
);

// TODO: Refactor to be dynamic. Local dev uri must be device IP.
export const apolloClient = new ApolloClient({
  uri: "https://api.subquery.network/sq/burnt-labs/xion-indexer",
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
});
