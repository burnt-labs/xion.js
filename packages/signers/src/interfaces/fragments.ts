import { gql } from "@apollo/client";

export const SMART_ACCOUNT_FRAGMENT = gql`
  fragment SmartAccountFragment on SmartAccountAuthenticator {
    id
    type
    authenticator
    authenticatorIndex
    version
  }
`;
