import { TextEncoder, TextDecoder } from "node:util";
import { SignArbSecp256k1HdWallet } from "./index";

global.TextEncoder = TextEncoder;
// @ts-expect-error: TextDecoder is not available in testing environment by default.
global.TextDecoder = TextDecoder;

describe("SignArbSecp256k1HdWallet", () => {
  let wallet: SignArbSecp256k1HdWallet;

  beforeEach(async () => {
    // DO NOT USE WALLET IN PRODUCTION
    const serialization = JSON.stringify({
      type: "directsecp256k1hdwallet-v1",
      kdf: {
        algorithm: "argon2id",
        params: {
          outputLength: 32,
          opsLimit: 24,
          memLimitKib: 12288,
        },
      },
      encryption: {
        algorithm: "xchacha20poly1305-ietf",
      },
      data: "8AV9HAqwKThQOZ/jW9HCkd89LNUo//W/+Rg+s1pzNp0TuFk3uut6pi9OgIRM2HRnLS68CjOCiZltc09EYmJBBBj5l0oVnPcAyJjcs1nlAPoppKiKqr1TWCYfNx/YhOmdFrghX9tWE9SWaAx5jwQFOvSbVZaWhv2shEShSvhZ/aUcZJDScN+TZFzwyvVFqE0TMpma8ZACDXmr1Mw+rWfy4KkiGV1+shiVsM9owpZfhrCKNzowpIYZJBn5xE/tMA==",
    });
    wallet = await SignArbSecp256k1HdWallet.deserialize(
      serialization,
      "abstraxion",
    );
  });

  test("signArb returns a signature for a valid signer address and message", async () => {
    const signerAddress = "xion1cgvua2mkvux6xaw20w4ltjcrs9u3kagfpqd3al"; // Empty test account
    const message = "test";
    const signature = await wallet.signArb(signerAddress, message);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe("string");
  });
});
