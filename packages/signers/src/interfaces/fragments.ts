import { gql } from "@apollo/client";

export interface SmartAccountFragment {
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
  version: string;
}

export const SMART_ACCOUNT_FRAGMENT = gql`
  fragment SmartAccountFragment on SmartAccountAuthenticator {
    id
    type
    authenticator
    authenticatorIndex
    version
  }
`;
