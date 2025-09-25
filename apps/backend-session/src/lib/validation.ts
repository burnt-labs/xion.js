import { z } from "zod";

export const connectWalletSchema = z.object({
  username: z.string().min(1, "Username is required"),
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

export const callbackSchema = z.object({
  granted: z.string().transform((val) => val === "true"),
  granter: z.string(),
  state: z.string(),
});

export const disconnectSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const statusSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export type ConnectWalletRequest = z.infer<typeof connectWalletSchema>;
export type CallbackRequest = z.infer<typeof callbackSchema>;
export type DisconnectRequest = z.infer<typeof disconnectSchema>;
export type StatusRequest = z.infer<typeof statusSchema>;
