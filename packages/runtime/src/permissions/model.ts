import type { DestinySkillPermission, GmailScope, CalendarScope, DriveScope, MemoryScope, FilesystemOperation } from "@destiny-os/shared";

export type PermissionCheck = {
  granted: boolean;
  reason?: string;
};

export class PermissionRegistry {
  private skills = new Map<string, DestinySkillPermission>();

  register(skillName: string, permissions: DestinySkillPermission): void {
    this.skills.set(skillName, permissions);
  }

  get(skillName: string): DestinySkillPermission | undefined {
    return this.skills.get(skillName);
  }

  unregister(skillName: string): void {
    this.skills.delete(skillName);
  }

  listAll(): Array<{ name: string; permissions: DestinySkillPermission }> {
    return Array.from(this.skills.entries()).map(([name, permissions]) => ({
      name,
      permissions,
    }));
  }
}

export class PermissionEnforcer {
  private registry: PermissionRegistry;

  constructor(registry: PermissionRegistry) {
    this.registry = registry;
  }

  checkGmailAccess(skillName: string, scope: GmailScope): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.gmail) return { granted: false, reason: `Gmail access not granted to "${skillName}"` };
    if (!perms.gmail.includes(scope)) {
      return { granted: false, reason: `Gmail scope "${scope}" not granted to "${skillName}"` };
    }
    return { granted: true };
  }

  checkCalendarAccess(skillName: string, scope: CalendarScope): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.calendar) return { granted: false, reason: `Calendar access not granted to "${skillName}"` };
    if (!perms.calendar.includes(scope)) {
      return { granted: false, reason: `Calendar scope "${scope}" not granted to "${skillName}"` };
    }
    return { granted: true };
  }

  checkDriveAccess(skillName: string, scope: DriveScope): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.drive) return { granted: false, reason: `Drive access not granted to "${skillName}"` };
    if (!perms.drive.includes(scope)) {
      return { granted: false, reason: `Drive scope "${scope}" not granted to "${skillName}"` };
    }
    return { granted: true };
  }

  checkMemoryAccess(skillName: string, scope: MemoryScope): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.memory) return { granted: false, reason: `Memory access not granted to "${skillName}"` };
    if (!perms.memory.includes(scope)) {
      return { granted: false, reason: `Memory scope "${scope}" not granted to "${skillName}"` };
    }
    return { granted: true };
  }

  checkFilesystemAccess(skillName: string, path: string, operation: FilesystemOperation): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.filesystem) return { granted: false, reason: `Filesystem access not granted to "${skillName}"` };

    if (!perms.filesystem.operations.includes(operation)) {
      return { granted: false, reason: `Filesystem operation "${operation}" not granted to "${skillName}"` };
    }

    const allowed = perms.filesystem.paths.some((p) => path.startsWith(p));
    if (!allowed) {
      return { granted: false, reason: `Path "${path}" not in allowed paths for "${skillName}"` };
    }

    return { granted: true };
  }

  checkNetworkAccess(skillName: string, host: string): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.network) return { granted: false, reason: `Network access not granted to "${skillName}"` };
    if (!perms.network.allowedHosts.includes(host)) {
      return { granted: false, reason: `Host "${host}" not in allowed hosts for "${skillName}"` };
    }
    return { granted: true };
  }

  checkExecution(skillName: string, command: string): PermissionCheck {
    const perms = this.registry.get(skillName);
    if (!perms) return { granted: false, reason: `Skill "${skillName}" has no registered permissions` };
    if (!perms.execution) return { granted: false, reason: `Execution not granted to "${skillName}"` };
    if (!perms.execution.allowShell) {
      return { granted: false, reason: `Shell execution not allowed for "${skillName}"` };
    }
    const allowed = perms.execution.allowedCommands.some((c) => command.startsWith(c));
    if (!allowed) {
      return { granted: false, reason: `Command "${command}" not in allowed commands for "${skillName}"` };
    }
    return { granted: true };
  }
}
