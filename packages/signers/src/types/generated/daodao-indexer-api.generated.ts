/**
 * DaoDAO Indexer API - auto-generated path types
 *
 * Generated from: DAO DAO API v0.0.1
 * Path count: 340
 *
 * DO NOT EDIT MANUALLY - regenerate with: pnpm generate:daodao-indexer-types
 *
 * NOTE: DaoDAO Indexer response schemas are not defined in the OpenAPI spec.
 * Response body types are maintained in signers/src/types/generated/daodao-indexer.ts
 */

export interface paths {
  "/{chainId}/a/balance/overTime": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          address?: string;
          denom?: string;
          startTime?: string;
          endTime?: string;
          timeStep?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/abstract/accountsOwnedBy": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
        query?: {
          key?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/bank/balance": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
        query?: {
          denom?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/bank/balances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/contract/ownedBy": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
        query?: {
          key?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/daos/adminOf": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/daos/memberOf": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/feegrant/allowance": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
        query?: {
          grantee?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/feegrant/allowances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
        query?: {
          type?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/feegrant/has": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
        query?: {
          grantee?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/nft/collections": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/nft/stakedWithDaos": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/polytone/proxies": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/proposals/created": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/proposals/stats": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/proposals/votesCast": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/tokens/list": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/valence/accounts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/vesting/ownerOf": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/account/{accountAddress}/veto/vetoableProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          accountAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/accountId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/info": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/moduleInfos": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/owner": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/subAccountIds": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/suspensionStatus": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/account/whitelistedModules": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/registry/accountsByModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/registry/localAccounts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/registry/module": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          name?: string;
          namespace?: string;
          version?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/registry/moduleConfig": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          name?: string;
          namespace?: string;
          version?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/abstract/registry/registeredModules": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/contractAdmin": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw1Whitelist/adminList": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/allAccounts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/allowance": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          owner?: string;
          spender?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/balance": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/daos": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/logoUrl": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/marketingInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/minter": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/ownerAllowances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          owner?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/spenderAllowances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          spender?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/tokenInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20/topAccountBalances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/claims": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/getHooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/listStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/stakedBalance": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/stakedBalanceAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/stakedValue": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/topStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/totalStaked": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/totalStakedAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw20Stake/totalValue": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw4Group/admin": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw4Group/hooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw4Group/listMembers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw4Group/member": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw4Group/totalWeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/allNftInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/allOperators": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          owner?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/allTokens": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/approvals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/approvalsForSpender": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
          spender?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/contractInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/minter": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/nftInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/numTokens": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/ownerOf": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cw721/tokens": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          owner?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/codeId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/listVestingContracts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/listVestingContractsByInstantiator": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          instantiator?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/listVestingContractsByInstantiatorReverse": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          instantiator?: string;
          limit?: number;
          startBefore?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/listVestingContractsByRecipient": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          recipient?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/listVestingContractsByRecipientReverse": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          recipient?: string;
          limit?: number;
          startBefore?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/listVestingContractsReverse": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwPayrollFactory/ownership": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwTokenSwap/status": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/info": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/ownership": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/totalToVest": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/unbondingDurationSeconds": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/validatorStakes": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/vestDuration": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/cwVesting/vested": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          t?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/activeProposalModules": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/admin": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/adminNomination": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/allMembers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          recursive?: boolean;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/allProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          filter?: string;
          recursive?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/approvalDaos": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/cw20Balances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/cw20List": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/cw721List": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/daoUri": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/dumpState": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/initialActions": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/item": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          key?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/junoHomeMetadata": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/lastActivity": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/lastMembershipChange": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/listItems": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/listMembers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/listSubDaos": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/memberCount": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          recursive?: boolean;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/openProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/pauseInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/paused": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/polytoneProxies": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/potentialSubDaos": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/proposalCount": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/proposalModules": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/votingModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoCore/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/approver": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/completedProposalIdForCreatedProposalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/completedProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/pendingProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/proposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/proposalCompletedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/proposalCreatedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/reverseCompletedProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalMultiple/reversePendingProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/approver": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/completedProposalIdForCreatedProposalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/completedProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/pendingProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/proposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/proposalCompletedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/proposalCreatedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/reverseCompletedProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprovalSingle/reversePendingProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/approverProposalIdForPreProposeApprovalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/preProposeApprovalContract": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/preProposeApprovalIdForApproverProposalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeApprover/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeMultiple/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeMultiple/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeMultiple/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeMultiple/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeSingle/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeSingle/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeSingle/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoPreProposeSingle/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/creationPolicy": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/delegationModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/listProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
          filter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/listVotes": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/nextProposalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/openProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/proposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/proposalCount": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/proposalCreatedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/reverseProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalMultiple/vote": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
          voter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/creationPolicy": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/delegationModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/listProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
          filter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/listVotes": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/nextProposalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/openProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/proposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/proposalCount": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/proposalCreatedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/reverseProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startBefore?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoProposalSingle/vote": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
          voter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoRbam/assignments": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoRbam/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoRbam/roles": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoRewardsDistributor/distribution": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoRewardsDistributor/distributions": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/delegates": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          startAfter?: string;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/delegations": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          delegator?: string;
          height?: number;
          offset?: number;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/info": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/proposalModules": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          startAfter?: string;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/registration": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          delegate?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/unvotedDelegatedVotingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          delegate?: string;
          proposalModule?: string;
          proposalId?: number;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/votingPowerCap": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoteDelegation/votingPowerHookCallers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          startAfter?: string;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVoting/activeThreshold": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/activeThreshold": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/stakingContract": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/tokenContract": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/topStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw20Staked/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw4/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw4/groupContract": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw4/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw4/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw4/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw4/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/activeThreshold": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/hooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/nftClaims": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/ownersOfStakedNfts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/stakedNfts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/staker": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/topStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingCw721Staked/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/activeThreshold": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/claims": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/getHooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/listStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/topStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingNativeStaked/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/activeThreshold": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/hooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/nftClaims": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/ownersOfStakedNfts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/stakedNfts": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/staker": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          tokenId?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/topStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingOnftStaked/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/allVotersWithVotingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/hooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/listVoters": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/nftContract": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/registeredNft": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingSgCommunityNft/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/activeThreshold": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/claims": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/denom": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/getHooks": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/listStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/tokenIssuerContract": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/topStakers": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/totalPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/totalPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/votingPower": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/daoVotingTokenStaked/votingPowerAtHeight": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
          height?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/details": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/info": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/instantiatedAt": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/item": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          key?: string;
          keys?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/map": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          key?: string;
          keys?: string;
          numeric?: boolean;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdPreProposeSingleOverrule/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdPreProposeSingleOverrule/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdPreProposeSingleOverrule/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdPreProposeSingleOverrule/overruleProposalId": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          timelockAddress?: string;
          subdaoProposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdPreProposeSingleOverrule/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoPreProposeSingle/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoPreProposeSingle/dao": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoPreProposeSingle/depositInfo": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          proposalId?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoPreProposeSingle/proposalModule": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoPreProposeSingle/timelockAddress": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoTimelockSingle/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoTimelockSingle/listProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          limit?: number;
          startAfter?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoTimelockSingle/proposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/neutron/cwdSubdaoTimelockSingle/proposalExecutionError": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/ownership": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/polytone/listener/note": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/polytone/listener/result": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          initiator?: string;
          initiatorMsg?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/polytone/note/remoteAddress": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/polytone/proxy/instantiator": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/polytone/voice/remoteController": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/polytone/voice/senderInfoForProxy": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          address?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/account/admin": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/account/data": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/account/fundsInAuction": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/account/rebalancerConfig": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/account/rebalancerTargets": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/auction/config": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/oracle/allPrices": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/oracle/price": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          pair?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/valence/oracle/pricesOfDenom": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
        query?: {
          base_denom?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/wasmswap/price": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/wasmswap/summary": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/account/authenticators": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/account/treasuries": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/admin": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/all": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/balances": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/feeConfig": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/grantConfigs": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/params": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/contract/{contractAddress}/xion/treasury/pendingAdmin": {
    get: {
      parameters: {
        path: {
          chainId: string;
          contractAddress: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/feegrant/activity": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          daysAgo?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/feegrant/amounts": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/feegrant/totals": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/decodedProposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/decodedVote": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          id?: number;
          voter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/proposal": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          id?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/proposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          offset?: number;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/reverseProposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          offset?: number;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/reverseVotes": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          id?: number;
          offset?: number;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/vote": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          id?: number;
          voter?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/gov/votes": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          id?: number;
          offset?: number;
          limit?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/stats/daos": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          daysAgo?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/stats/proposals": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          daysAgo?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/stats/uniqueVoters": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          daysAgo?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/stats/votes": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          daysAgo?: number;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
  "/{chainId}/generic/_/token/daos": {
    get: {
      parameters: {
        path: {
          chainId: string;
        };
        query?: {
          denom?: string;
        };
      };
      responses: {
        /** success */
        200: {
          content: {
            "application/json": unknown;
          };
        };
        /** missing required arguments */
        400: {
          content: {
            "application/json": unknown;
          };
        };
      };
    };
  };
}

/** All valid DaoDAO Indexer API path strings */
export type DaoDaoIndexerPath = keyof paths;
/** All xion/treasury formula paths */
export type DaoDaoIndexerXionTreasuryPath =
  "/{chainId}/contract/{contractAddress}/xion/treasury/admin"
  |   "/{chainId}/contract/{contractAddress}/xion/treasury/all"
  |   "/{chainId}/contract/{contractAddress}/xion/treasury/balances"
  |   "/{chainId}/contract/{contractAddress}/xion/treasury/feeConfig"
  |   "/{chainId}/contract/{contractAddress}/xion/treasury/grantConfigs"
  |   "/{chainId}/contract/{contractAddress}/xion/treasury/params"
  |   "/{chainId}/contract/{contractAddress}/xion/treasury/pendingAdmin";
