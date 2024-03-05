import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createStytchHeadlessClient } from "@stytch/nextjs/headless";
import { StytchHeadlessClient } from "@stytch/vanilla-js/dist/index.headless";
import { getEnvStringOrThrow } from "./utils";

export const stytchClient: StytchHeadlessClient = createStytchHeadlessClient(
  getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_STYTCH_PUBLIC_TOKEN",
    process.env.NEXT_PUBLIC_DEFAULT_STYTCH_PUBLIC_TOKEN,
  ),
);

// TODO: Refactor to be dynamic. Local dev uri must be device IP.
export const apolloClient = new ApolloClient({
  uri: getEnvStringOrThrow(
    "NEXT_PUBLIC_DEFAULT_INDEXER_URL",
    process.env.NEXT_PUBLIC_DEFAULT_INDEXER_URL,
  ),
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
});
