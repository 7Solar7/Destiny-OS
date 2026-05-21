import type {
  CompletionRequest,
  CompletionResponse,
  ProviderConfig,
  ProviderType,
} from "@destiny-os/shared";

export interface ProviderAdapter {
  readonly type: ProviderType;
  readonly config: ProviderConfig;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  countTokens(text: string): Promise<number>;
}

export type ProviderFactory = (config: ProviderConfig) => ProviderAdapter;

export class ProviderRegistry {
  private factories = new Map<ProviderType, ProviderFactory>();
  private instances = new Map<string, ProviderAdapter>();

  register(type: ProviderType, factory: ProviderFactory): void {
    this.factories.set(type, factory);
  }

  create(type: ProviderType, config: ProviderConfig): ProviderAdapter {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for provider type: ${type}`);
    }
    const instance = factory(config);
    this.instances.set(type, instance);
    return instance;
  }

  get(type: ProviderType): ProviderAdapter | undefined {
    return this.instances.get(type);
  }

  unregister(type: ProviderType): void {
    this.instances.delete(type);
    this.factories.delete(type);
  }
}
