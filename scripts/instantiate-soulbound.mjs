import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { fromHex } from "@cosmjs/encoding";

import dotenv from "dotenv";

dotenv.config();

const key = process.env.PRIVATE_KEY;
if (!key) {
  console.error("Private key is missing. Please check your .env file.");
  process.exit(1);
}

const rpcEndpoint = "https://rpc.xion-testnet-1.burnt.com:443";
const contractCodeId = 1674; // Testnet Code ID

async function instantiateContract() {
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

  const msg = {
    name: "Soulbound Token",
    symbol: "SBT",
    minter: accountData.address,
  };

  const result = await client.instantiate(
    accountData.address,
    contractCodeId,
    msg,
    "Soulbound Token - Instantiation",
    "auto",
    { admin: accountData.address },
  );
  console.log("Contract instantiated at address:", result.contractAddress);
}

instantiateContract().catch(console.error);
