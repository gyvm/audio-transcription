import type { TranscriptionProvider } from './TranscriptionProvider';
import type { ProviderInfo, MultiAPIResult, EnhancedTranscriptionResult } from '../../../types/provider';
import type { AudioFile } from '../../../types/audio';

export class ProviderRegistry {
  private providers: Map<string, TranscriptionProvider> = new Map();
  private providerConstructors: Map<string, new (...args: any[]) => TranscriptionProvider> = new Map();

  // プロバイダーのコンストラクタを登録
  registerProviderClass<T extends TranscriptionProvider>(
    providerId: string,
    providerClass: new (...args: any[]) => T
  ): void {
    this.providerConstructors.set(providerId, providerClass);
  }

  // プロバイダーインスタンスを登録
  registerProvider(provider: TranscriptionProvider): void {
    const info = provider.getProviderInfo();
    this.providers.set(info.id, provider);
  }

  // プロバイダーを取得
  getProvider(providerId: string): TranscriptionProvider | undefined {
    return this.providers.get(providerId);
  }

  // 登録された全プロバイダーを取得
  getAllProviders(): TranscriptionProvider[] {
    return Array.from(this.providers.values());
  }

  // 登録された全プロバイダー情報を取得
  getAllProviderInfos(): ProviderInfo[] {
    return this.getAllProviders().map(provider => provider.getProviderInfo());
  }

  // 特定の機能を持つプロバイダーを検索
  findProvidersByCapability(capability: keyof import('../../../types/provider').ServiceCapabilities): TranscriptionProvider[] {
    return this.getAllProviders().filter(provider => {
      const capabilities = provider.getCapabilities();
      return capabilities[capability];
    });
  }

  // 複数プロバイダーで並列実行
  async transcribeWithMultipleProviders(
    audioFile: AudioFile,
    providerIds: string[]
  ): Promise<MultiAPIResult> {
    const providers = providerIds
      .map(id => this.getProvider(id))
      .filter((provider): provider is TranscriptionProvider => provider !== undefined);

    if (providers.length === 0) {
      throw new Error('No valid providers found');
    }

    const results: EnhancedTranscriptionResult[] = [];
    const errors: Array<{ apiId: string; error: string }> = [];
    let completedCount = 0;

    // 並列実行
    const promises = providers.map(async (provider) => {
      try {
        const result = await provider.transcribeWithDetails(audioFile);
        results.push(result);
        completedCount++;
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          apiId: provider.getProviderInfo().id,
          error: errorMessage
        });
        completedCount++;
        throw error;
      }
    });

    // すべての結果を待つ（エラーでも継続）
    await Promise.allSettled(promises);

    return {
      audioFile,
      results,
      completedCount,
      totalCount: providers.length,
      isCompleted: completedCount === providers.length,
      errors
    };
  }

  // プロバイダーの動的ロード（将来の拡張用）
  async loadProvider(providerId: string, ...constructorArgs: any[]): Promise<TranscriptionProvider> {
    const providerClass = this.providerConstructors.get(providerId);
    if (!providerClass) {
      throw new Error(`Provider class not found: ${providerId}`);
    }

    const provider = new providerClass(...constructorArgs);
    this.registerProvider(provider);
    return provider;
  }

  // プロバイダーの削除
  unregisterProvider(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  // 全プロバイダーをクリア
  clear(): void {
    this.providers.clear();
  }

  // プロバイダーの存在確認
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }
}