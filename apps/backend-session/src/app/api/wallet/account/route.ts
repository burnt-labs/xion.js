import { getAbstraxionBackend } from "@/lib/xion/abstraxion-backend";
import { createApiWrapper } from "@/lib/api-wrapper";
import { requireAuth } from "@/lib/auth-middleware";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

export const dynamic = "force-dynamic";

export const GET = createApiWrapper(
  async (context) => {
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
      const authz = await abstraxionBackend.startAbstraxionBackendAuth(
        user.id,
        context.request as any,
      );
      const client = await authz.getCosmWasmClient();

      // Query all balances for the meta account
      const [xionBalance, usdcBalance] = await Promise.all([
        client.getBalance(status.metaAccountAddress, "uxion"),
        client.getBalance(status.metaAccountAddress, "uusdc"),
      ]);
      // Convert from micro units to main units
      const xionBalanceFormatted = (
        parseInt(xionBalance.amount) / 1_000_000
      ).toString();
      const usdcBalanceFormatted = (
        parseInt(usdcBalance.amount) / 1_000_000
      ).toString();

      return {
        metaAccountAddress: status.metaAccountAddress,
        balances: {
          xion: {
            amount: xionBalanceFormatted,
            denom: xionBalance.denom,
            microAmount: xionBalance.amount,
          },
          usdc: {
            amount: usdcBalanceFormatted,
            denom: usdcBalance.denom,
            microAmount: usdcBalance.amount,
          },
        },
      };
    } catch (error) {
      console.error("Error querying wallet balances:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("No active wallet connection")) {
          throw error; // Re-throw wallet connection errors as-is
        }
        throw new Error(`Failed to query wallet balances: ${error.message}`);
      }

      throw new Error("Failed to query wallet balances");
    }
  },
  {
    rateLimit: "normal",
    allowedMethods: ["GET"],
  },
);
