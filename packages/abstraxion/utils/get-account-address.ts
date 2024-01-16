import { DirectSecp256k1HdWallet } from "graz/dist/cosmjs";

export async function getAccountAddress() {
  const existingKeypair = localStorage.getItem("xion-authz-temp-account");
  if (!existingKeypair) {
    return "";
  }
  const deserializedKeypair = await DirectSecp256k1HdWallet.deserialize(
    existingKeypair,
    "abstraxion",
  );

  const accounts = await deserializedKeypair.getAccounts();
  const address = accounts[0].address;
  return address;
}
