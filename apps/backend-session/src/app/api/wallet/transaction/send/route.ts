import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { createApiWrapper } from "@/lib/api-wrapper";
import { requireAuth } from "@/lib/auth-middleware";
import {
  sendTransactionSchema,
  SendTransactionRequest,
} from "@/lib/validation";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";

export const dynamic = "force-dynamic";

export const POST = createApiWrapper(
  async (context) => {
    const { validatedData } = context;
    const { to, amount, denom } = validatedData as SendTransactionRequest;

    // Get authenticated user from session
    const authContext = await requireAuth(context.request);
    const { user } = authContext;

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Check if user has an active wallet connection
    const status = await abstraxionBackend.checkStatus(user.id);

    if (!status.connected || !status.metaAccountAddress) {
      throw new Error("No active wallet connection found");
    }

    try {
      // Start AbstraxionAuth to get the signing client
      const abstraxionAuth = await abstraxionBackend.startAbstraxionBackendAuth(
        user.id,
        context.request as any,
      );
      const signer = await abstraxionAuth.getSigner(
        abstraxionBackend.gasPriceDefault,
      );

      // Convert amount to micro units
      const amountNum = parseFloat(amount);
      const microAmount = Math.floor(amountNum * 1_000_000).toString();
      const denomMicro = denom === "XION" ? "uxion" : "uusdc";

      // Create the bank send message
      const msgSend: MsgSend = {
        fromAddress: status.metaAccountAddress,
        toAddress: to,
        amount: [
          {
            denom: denomMicro,
            amount: microAmount,
          },
        ],
      };

      // Sign and broadcast the transaction
      const result = await signer.signAndBroadcast(
        status.metaAccountAddress,
        [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: msgSend,
          },
        ],
        "auto",
      );

      return {
        transactionHash: result.transactionHash,
        fromAddress: status.metaAccountAddress,
        toAddress: to,
        amount: amount,
        denom: denom,
        gasUsed: result.gasUsed?.toString(),
        gasWanted: result.gasWanted?.toString(),
      };
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to send transaction",
      );
    }
  },
  {
    schema: sendTransactionSchema,
    schemaType: "body",
    rateLimit: "normal",
    allowedMethods: ["POST"],
  },
);
