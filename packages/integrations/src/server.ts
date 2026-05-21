import type { IntegrationConfig } from "./types.js";

export function createIntegrationServer(config: IntegrationConfig) {
  return {
    config,
    isConfigured: (provider: keyof IntegrationConfig) => {
      return !!config[provider];
    },
    listConfigured: () => {
      return Object.entries(config)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k);
    },
  };
}
