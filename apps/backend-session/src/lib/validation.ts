import { z } from "zod";

export const connectWalletSchema = z.object({
  permissions: z
    .object({
      contracts: z.array(z.string()).optional(),
      bank: z
        .array(
          z.object({
            denom: z.string(),
            amount: z.string(),
          }),
        )
        .optional(),
      stake: z.boolean().optional(),
      treasury: z.string().optional(),
      expiry: z.number().optional(),
    })
    .optional(),
  grantedRedirectUrl: z.string().url().optional(),
});

export const disconnectSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const statusSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const grantSessionCallbackSchema = z.object({
  granted: z.string().transform((val) => val === "true"),
  granter: z.string(),
  state: z.string(),
});

export const sendTransactionSchema = z.object({
  to: z.string().min(1, "Recipient address is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be a positive number"),
  denom: z.enum(["XION", "USDC"], {
    errorMap: () => ({ message: "Denom must be either XION or USDC" }),
  }),
});

export type ConnectWalletRequest = z.infer<typeof connectWalletSchema>;
export type DisconnectRequest = z.infer<typeof disconnectSchema>;
export type StatusRequest = z.infer<typeof statusSchema>;
export type GrantSessionCallbackRequest = z.infer<
  typeof grantSessionCallbackSchema
>;
export type SendTransactionRequest = z.infer<typeof sendTransactionSchema>;
