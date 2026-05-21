import { z } from "zod";

export const RetentionPolicy = z.enum(["session", "task", "project", "permanent"]);
export type RetentionPolicy = z.infer<typeof RetentionPolicy>;

export const ArtifactSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  runId: z.string(),
  stepId: z.string().optional(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  storagePath: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  checksum: z.string().optional(),
  retention: RetentionPolicy.default("task"),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const CreateArtifactSchema = ArtifactSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateArtifact = z.infer<typeof CreateArtifactSchema>;
