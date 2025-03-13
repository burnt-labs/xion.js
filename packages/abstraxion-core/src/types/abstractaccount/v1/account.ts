import { Any } from "cosmjs-types/google/protobuf/any";

/**
 * AbstractAccount is a smart contract that is capable of initiating txs.
 *
 * This account type is similar to BaseAccount except for it doesn't have a
 * pubkey. If a pubkey is needed, it creates and returns a new NilPubKey.
 */
export interface AbstractAccount {
  address: string;
  accountNumber: bigint;
  sequence: bigint;
  pubKey?: Any;
}

/**
 * NilPubKey is a pubkey type that's used for abstract accounts.
 */
export interface NilPubKey {
  addressBytes: Uint8Array;
}

/**
 * Simple implementation of fromBinary for AbstractAccount
 */
export namespace AbstractAccount {
  export function fromBinary(binary: Uint8Array): AbstractAccount {
    // This is a simplified implementation
    // In a real implementation, you would use a proper protobuf decoder
    const decoder = new TextDecoder();
    let data;
    
    try {
      data = JSON.parse(decoder.decode(binary));
    } catch (e) {
      // Fallback to a generic object in case the binary isn't valid JSON
      data = {};
    }
    
    return {
      address: data.address || "",
      accountNumber: BigInt(data.account_number || 0),
      sequence: BigInt(data.sequence || 0),
    };
  }
} 