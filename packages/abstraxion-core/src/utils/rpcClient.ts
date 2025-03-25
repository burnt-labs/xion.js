import {
  Comet38Client,
  HttpClient,
  HttpEndpoint,
  WebsocketClient,
} from "@cosmjs/tendermint-rpc";

export const getRpcClient = async (
  endpoint: string | HttpEndpoint,
): Promise<Comet38Client> => {
  const useHttp =
    typeof endpoint === "string"
      ? endpoint.startsWith("http://") || endpoint.startsWith("https://")
      : endpoint.url.startsWith("http://") ||
        endpoint.url.startsWith("https://");
  const rpcClient = useHttp
    ? new HttpClient(endpoint)
    : new WebsocketClient(
        typeof endpoint === "string" ? endpoint : endpoint.url,
      );
  return Comet38Client.create(rpcClient);
};
