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
});

export const callbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State parameter is required"),
  username: z.string().min(1, "Username is required"),
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
