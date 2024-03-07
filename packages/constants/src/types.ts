// Interface for rpc status response
export interface RpcStatusResponse {
  jsonrpc: string;
  id: number;
  result: RpcStatusResult;
}

export interface RpcStatusResult {
  node_info: RpcStatusResultNodeInfo;
  sync_info: RpcStatusResultSyncInfo;
}

export interface RpcStatusResultNodeInfo {
  protocol_version: any;
  id: string;
  network: string;
  version: string;
  channels: string;
  moniker: string;
  other: any;
}

export interface RpcStatusResultSyncInfo {
  latest_block_hash: string;
  latest_app_hash: string;
  latest_block_height: string;
  latest_block_time: string;
  earliest_block_hash: string;
  earliest_app_hash: string;
  earliest_block_height: string;
  earliest_block_time: string;
  catching_up: boolean;
}
