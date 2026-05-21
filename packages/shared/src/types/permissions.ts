import { z } from "zod";

export const GmailScope = z.enum(["read", "draft", "send", "delete"]);
export type GmailScope = z.infer<typeof GmailScope>;

export const CalendarScope = z.enum(["read", "create", "update", "delete"]);
export type CalendarScope = z.infer<typeof CalendarScope>;

export const DriveScope = z.enum(["read", "write", "delete"]);
export type DriveScope = z.infer<typeof DriveScope>;

export const MemoryScope = z.enum(["read", "write", "search"]);
export type MemoryScope = z.infer<typeof MemoryScope>;

export const FilesystemOperation = z.enum(["read", "write", "list"]);
export type FilesystemOperation = z.infer<typeof FilesystemOperation>;

export const FilesystemPermissionSchema = z.object({
  paths: z.array(z.string()),
  operations: z.array(FilesystemOperation),
});

export const NetworkPermissionSchema = z.object({
  allowedHosts: z.array(z.string()),
});

export const ExecutionPermissionSchema = z.object({
  allowedCommands: z.array(z.string()),
  allowShell: z.boolean().default(false),
});

export const DestinySkillPermissionSchema = z.object({
  gmail: z.array(GmailScope).optional(),
  calendar: z.array(CalendarScope).optional(),
  drive: z.array(DriveScope).optional(),
  memory: z.array(MemoryScope).optional(),
  filesystem: FilesystemPermissionSchema.optional(),
  network: NetworkPermissionSchema.optional(),
  execution: ExecutionPermissionSchema.optional(),
});
export type DestinySkillPermission = z.infer<typeof DestinySkillPermissionSchema>;

export const SkillMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  permissions: DestinySkillPermissionSchema,
});
export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;
