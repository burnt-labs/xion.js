import { Button, Input } from "@burnt-labs/ui";
import { useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";

import type { GranteeSignerClient } from "@burnt-labs/abstraxion-core";

import { BlockingButton } from "./blocking-button.tsx";

const copyToClipboard = (textToCopy: string) => async () => {
  await window.navigator.clipboard.writeText(textToCopy);
};

// This component is a wizard of sorts showcasing the ability to sign and verify arbitrary ADR-036 signatures
export function SignArb() {
  const [signArbResult, setSignArbResult] = useState<string | undefined>();
  const [arbitraryMessage, setArbitraryMessage] = useState<string>("");

  if (signArbResult) {
    return (
      <SignArbVerify
        message={arbitraryMessage}
        signature={signArbResult}
        clearSigFn={async () => {
          setArbitraryMessage("");
          setSignArbResult(undefined);
        }}
      />
    );
  }

  return (
    <SignArbSign
      setResult={setSignArbResult}
      arbitraryMessage={arbitraryMessage}
      setArbitraryMessage={setArbitraryMessage}
    />
  );
}

interface SignArbSignProps {
  setResult: (signature: string) => void;
  arbitraryMessage: string;
  setArbitraryMessage: (signature: string) => void;
}

function SignArbSign({
  setResult,
  arbitraryMessage,
  setArbitraryMessage,
}: SignArbSignProps) {
  const { client, signArb } = useAbstraxionSigningClient();

  async function handleSign(): Promise<void> {
    if (client?.granteeAddress) {
      const response = await signArb?.(client.granteeAddress, arbitraryMessage);
      // eslint-disable-next-line no-console -- We log this for testing purposes.
      if (response) setResult(response);
    }
  }

  return (
    <div className="mt-10 w-full">
      <h3 className="text-sm font-normal tracking-tighter text-white">
        SIGN ARBITRARY MESSAGE
      </h3>
      <Input
        className="ui-w-full ui-mb-4"
        onChange={(e) => {
          setArbitraryMessage(e.target.value);
        }}
        placeholder="Message..."
        value={arbitraryMessage}
      />
      <Button
        fullWidth
        onClick={() => {
          void handleSign();
        }}
      >
        Sign
      </Button>
    </div>
  );
}

interface SignArbVerifyProps {
  message: string;
  signature: string;
  clearSigFn(): Promise<void>;
}

const verifySignatureWithApi = async (
  client: GranteeSignerClient,
  metaAccountAddress: string,
  message: string,
  signature: string,
) => {
  const granteeAccountData = await client.getGranteeAccountData();

  if (!granteeAccountData) return false;

  const userSessionAddress = granteeAccountData.address;
  const userSessionPubKey = Buffer.from(granteeAccountData.pubkey).toString(
    "base64",
  );

  const baseUrl = `${window.location.origin}/api/check-signature`;
  const url = new URL(baseUrl);
  const params = new URLSearchParams({
    userSessionAddress,
    userSessionPubKey,
    metaAccountAddress,
    message,
    signature,
  });
  url.search = params.toString();
  const data = await fetch(url, {
    cache: "no-store",
  })
    .then(
      (
        response,
      ): Promise<{
        valid: boolean;
      }> => response.json(),
    )
    .catch((err) => {
      console.error("Could not fetch grants info", err);
    });

  if (data && data.valid) {
    return true;
  }

  return false;
};

function SignArbVerify({ message, signature, clearSigFn }: SignArbVerifyProps) {
  const { client } = useAbstraxionSigningClient();
  const { data: account } = useAbstraxionAccount();

  if (!client) return <div></div>;

  return (
    <div className="mt-10 w-full">
      <h1 className="text-lg font-normal tracking-tighter text-white">
        Signature
      </h1>
      <p className="m-2 overflow-hidden text-ellipsis text-xs">{signature}</p>
      <h1 className="text-lg font-normal tracking-tighter text-white">
        User Session Address
      </h1>
      <p className="m-2 overflow-hidden text-ellipsis text-xs">
        {client.granteeAddress}
      </p>
      <h1 className="text-lg font-normal tracking-tighter text-white">
        Meta Account Address
      </h1>
      <p className="m-2 overflow-hidden text-ellipsis text-xs">
        {account.bech32Address}
      </p>

      <div className="flex-col space-y-2">
        <BlockingButton
          text="Verify Signature"
          onExecute={async () => {
            const result = await verifySignatureWithApi(
              client,
              account.bech32Address,
              message,
              signature,
            );

            alert(`You message is ${result ? "valid" : "invalid"}!!!!`);
          }}
        />
        <BlockingButton
          text="Copy Signature to Clipboard"
          onExecute={copyToClipboard(signature || "")}
        />
        <BlockingButton text="Reset" onExecute={clearSigFn} />
      </div>
    </div>
  );
}
