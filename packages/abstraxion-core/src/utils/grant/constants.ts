export enum AUTHORIZATION_TYPES {
  GENERIC = "/cosmos.authz.v1beta1.GenericAuthorization",
  SEND = "/cosmos.bank.v1beta1.SendAuthorization",
  STAKE = "/cosmos.staking.v1beta1.StakeAuthorization",
  CONTRACT_EXECUTION = "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  UNSUPPORTED = "Unsupported",
}

export enum CONTRACT_EXEC_FILTER_TYPES {
  ACCEPTED_KEYS = "/cosmwasm.wasm.v1.AcceptedMessageKeysFilter",
  ACCEPTED_MESSAGES = "/cosmwasm.wasm.v1.AcceptedMessagesFilter",
  ALLOW_ALL = "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
}

export enum CONTRACT_EXEC_LIMIT_TYPES {
  MAX_CALLS = "/cosmwasm.wasm.v1.MaxCallsLimit",
  MAX_FUNDS = "/cosmwasm.wasm.v1.MaxFundsLimit",
  COMBINED_LIMIT = "/cosmwasm.wasm.v1.CombinedLimit",
}
