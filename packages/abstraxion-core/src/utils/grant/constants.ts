export enum AuthorizationTypes {
  Generic = "/cosmos.authz.v1beta1.GenericAuthorization",
  Send = "/cosmos.bank.v1beta1.SendAuthorization",
  IbcTransfer = "/ibc.applications.transfer.v1.TransferAuthorization",
  Stake = "/cosmos.staking.v1beta1.StakeAuthorization",
  ContractExecution = "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
  Unsupported = "Unsupported",
}

export enum ContractExecFilterTypes {
  AcceptedKeys = "/cosmwasm.wasm.v1.AcceptedMessageKeysFilter",
  AcceptedMessages = "/cosmwasm.wasm.v1.AcceptedMessagesFilter",
  AllowAll = "/cosmwasm.wasm.v1.AllowAllMessagesFilter",
}

export enum ContractExecLimitTypes {
  MaxCalls = "/cosmwasm.wasm.v1.MaxCallsLimit",
  MaxFunds = "/cosmwasm.wasm.v1.MaxFundsLimit",
  CombinedLimit = "/cosmwasm.wasm.v1.CombinedLimit",
}
