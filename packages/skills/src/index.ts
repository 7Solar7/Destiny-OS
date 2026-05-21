import type { DestinySkillPermission } from "@destiny-os/shared";

export interface SkillContext {
  taskId?: string;
  runId?: string;
  memory: {
    read: (path: string) => string | undefined;
    write: (path: string, content: string) => void;
    search: (query: string) => string[];
  };
}

export interface SkillResult {
  success: boolean;
  output?: unknown;
  error?: string;
  artifacts?: string[];
}

export interface DestinySkill {
  name: string;
  description: string;
  version: string;
  permissions: DestinySkillPermission;
  execute(ctx: SkillContext): Promise<SkillResult>;
}

export class SkillRegistry {
  private skills = new Map<string, DestinySkill>();

  register(skill: DestinySkill): void {
    this.skills.set(skill.name, skill);
  }

  get(name: string): DestinySkill | undefined {
    return this.skills.get(name);
  }

  listAll(): DestinySkill[] {
    return Array.from(this.skills.values());
  }

  unregister(name: string): void {
    this.skills.delete(name);
  }
}
