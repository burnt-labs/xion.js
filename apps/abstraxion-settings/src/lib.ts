import { ApolloClient, InMemoryCache } from "@apollo/client";
import { StytchHeadlessClient } from "@stytch/vanilla-js/headless";
import { getEnvStringOrThrow } from "./utils";

export const stytchClient = new StytchHeadlessClient(
  getEnvStringOrThrow(
    "VITE_DEFAULT_STYTCH_PUBLIC_TOKEN",
    import.meta.env.VITE_DEFAULT_STYTCH_PUBLIC_TOKEN,
  ),
);

// TODO: Refactor to be dynamic. Local dev uri must be device IP.
export const apolloClient = new ApolloClient({
  uri: getEnvStringOrThrow(
    "VITE_DEFAULT_INDEXER_URL",
    import.meta.env.VITE_DEFAULT_INDEXER_URL,
  ),
  cache: new InMemoryCache(),
  assumeImmutableResults: true,
});
