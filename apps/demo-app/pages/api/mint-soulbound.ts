import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { GasPrice } from "@cosmjs/stargate";
import { fromHex } from "@cosmjs/encoding";
import { createHash } from "crypto";

const rpcEndpoint = "https://rpc.xion-testnet-1.burnt.com:443";
const key = process.env.PRIVATE_KEY;

// Put the contract address returned from the deploy script here
const contractAddress =
  "xion1rcdjfs8f0dqrfyep28m6rgfuw5ue2y788lk5jsj0ll5f2jekh6yqm95y32";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  } else if (!key) {
    return res.status(400).json({ error: "Private key is required" });
  }

  try {
    const tendermint = await Tendermint37Client.connect(rpcEndpoint);
    const signer = await DirectSecp256k1Wallet.fromKey(fromHex(key), "xion");
    const [accountData] = await signer.getAccounts();

    const client = await SigningCosmWasmClient.createWithSigner(
      tendermint,
      signer,
      {
        gasPrice: GasPrice.fromString("0.001uxion"),
      },
    );

    const uniqueString = `${Date.now()}-${Math.random()}`;
    const tokenId = createHash("sha256").update(uniqueString).digest("hex");

    const msg = {
      mint: {
        token_id: tokenId,
        owner: address,
        token_uri: null,
        extension: null,
      },
    };

    const fee = "auto";

    const result = await client.execute(
      accountData.address,
      contractAddress,
      msg,
      fee,
    );
    return res.status(200).json({ txHash: result.transactionHash, tokenId });
  } catch (error) {
    console.error("Error executing transaction:", error);
    return res.status(500).json({ error: "Failed to execute transaction" });
  }
}
