import { z } from "zod";

export const IntegrationConfigSchema = z.object({
  github: z
    .object({
      token: z.string().optional(),
      baseUrl: z.string().default("https://api.github.com"),
    })
    .optional(),
  stripe: z
    .object({
      secretKey: z.string().optional(),
    })
    .optional(),
  shopify: z
    .object({
      storeUrl: z.string().optional(),
      accessToken: z.string().optional(),
    })
    .optional(),
  firecrawl: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().default("https://api.firecrawl.dev"),
    })
    .optional(),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
