/**
 * Fluent builder for creating grant authorization objects
 */

import type { GrantsResponse } from '../mocks/grants.js';

export interface Grant {
  authorization: any;
  expiration: string;
}

export class GrantBuilder {
  private authorization: any = {};
  private expiration: string = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year default

  /**
   * Create a bank send authorization
   */
  withBankSend(spendLimit: Array<{ denom: string; amount: string }> = [{ denom: "uxion", amount: "1000000" }]): this {
    this.authorization = {
      "@type": "/cosmos.bank.v1beta1.SendAuthorization",
      spend_limit: spendLimit,
      allow_list: [],
    };
    return this;
  }

  /**
   * Create a generic authorization
   */
  withGenericAuth(msg: string): this {
    this.authorization = {
      "@type": "/cosmos.authz.v1beta1.GenericAuthorization",
      msg,
    };
    return this;
  }

  /**
   * Create a stake authorization
   */
  withStakeAuth(
    type: "AUTHORIZATION_TYPE_DELEGATE" | "AUTHORIZATION_TYPE_UNDELEGATE" | "AUTHORIZATION_TYPE_REDELEGATE",
    maxTokens: { denom: string; amount: string } | null = null
  ): this {
    this.authorization = {
      "@type": "/cosmos.staking.v1beta1.StakeAuthorization",
      max_tokens: maxTokens,
      authorization_type: type,
    };
    return this;
  }

  /**
   * Create a contract execution authorization
   */
  withContractExecution(
    contracts: Array<{
      contract: string;
      limit?: any;
      filter?: any;
    }>
  ): this {
    this.authorization = {
      "@type": "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
      grants: contracts.map((c) => ({
        contract: c.contract,
        limit: c.limit || {
          "@type": "/cosmwasm.wasm.v1.MaxCallsLimit",
          remaining: "255",
        },
        filter: c.filter || {
          "@type": "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
        },
      })),
    };
    return this;
  }

  /**
   * Set custom authorization object
   */
  withAuthorization(auth: any): this {
    this.authorization = auth;
    return this;
  }

  /**
   * Set expiration date
   */
  withExpiration(date: Date | string | number): this {
    if (typeof date === 'number') {
      this.expiration = new Date(date).toISOString();
    } else if (typeof date === 'string') {
      this.expiration = date;
    } else {
      this.expiration = date.toISOString();
    }
    return this;
  }

  /**
   * Build a single grant
   */
  build(): Grant {
    return {
      authorization: this.authorization,
      expiration: this.expiration,
    };
  }

  /**
   * Build a grants response with this grant
   */
  buildResponse(): GrantsResponse {
    return {
      grants: [this.build()],
      pagination: {
        next_key: null,
        total: "1",
      },
    };
  }
}

/**
 * Helper to build a grants response with multiple grants
 */
export class GrantsResponseBuilder {
  private grants: Grant[] = [];

  addGrant(grant: Grant): this {
    this.grants.push(grant);
    return this;
  }

  addGrantBuilder(builder: GrantBuilder): this {
    this.grants.push(builder.build());
    return this;
  }

  build(): GrantsResponse {
    return {
      grants: this.grants,
      pagination: {
        next_key: null,
        total: this.grants.length.toString(),
      },
    };
  }
}
