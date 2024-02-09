import { gql } from "@apollo/client";
import { SMART_ACCOUNT_FRAGMENT } from "./fragments";

export const AllSmartWalletQuery = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($authenticator: String!) {
    smartAccounts(
      filter: {
        authenticators: { some: { authenticator: { equalTo: $authenticator } } }
      }
    ) {
      nodes {
        authenticators {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;

export const SingleSmartWalletQuery = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($id: String!) {
    smartAccount(id: $id) {
      id
      latestAuthenticatorId
      authenticators {
        nodes {
          ...SmartAccountFragment
        }
      }
    }
  }
`;

export const AllSmartWalletQueryByAccountId = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($id: String!) {
    smartAccounts(filter: { id: { equalTo: $id } }) {
      nodes {
        authenticators {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;

export const SmartWalletIndexQueryByAccountId = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($id: String!, $index: Int!) {
    smartAccounts(filter: { id: { equalTo: $id } }) {
      nodes {
        authenticators(filter: { authenticatorIndex: { equalTo: $index } }) {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;

export const AllSmartWalletQueryByIdAndAuthenticator = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($id: String!, $authenticator: String!) {
    smartAccounts(
      filter: {
        id: { equalTo: $id }
        authenticators: { some: { authenticator: { equalTo: $authenticator } } }
      }
    ) {
      nodes {
        authenticators {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;

export const AllSmartWalletQueryByIdAndType = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($id: String!, $type: String!) {
    smartAccounts(
      filter: {
        id: { equalTo: $id }
        authenticators: { some: { type: { equalTo: $type } } }
      }
    ) {
      nodes {
        authenticators {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;

export const AllSmartWalletQueryByIdAndTypeAndAuthenticator = gql`
  ${SMART_ACCOUNT_FRAGMENT}
  query ($id: String!, $type: String!, $authenticator: String!) {
    smartAccounts(
      filter: {
        id: { equalTo: $id }
        authenticators: {
          some: {
            authenticator: { equalTo: $authenticator }
            type: { equalTo: $type }
          }
        }
      }
    ) {
      nodes {
        authenticators {
          nodes {
            ...SmartAccountFragment
          }
        }
      }
    }
  }
`;
