import { useState, useCallback, useContext } from 'react';
import { DIContainerContext } from './useTranscription';
import { ProviderRegistry } from '../services/transcription/core/ProviderRegistry';
import type { AudioFile } from '../types/audio';
import type { 
  MultiAPIResult, 
  EnhancedTranscriptionResult, 
  ProviderInfo 
} from '../types/provider';
import { useErrorHandler } from './useErrorHandler';

export const useMultiAPITranscription = () => {
  const [results, setResults] = useState<MultiAPIResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

  const container = useContext(DIContainerContext);
  const { handleError } = useErrorHandler();

  if (!container) {
    throw new Error('useMultiAPITranscription must be used within a DIContainerProvider');
  }

  // プロバイダーレジストリの作成
  const createProviderRegistry = useCallback((): ProviderRegistry => {
    const registry = new ProviderRegistry();
    
    // 既存のサービスをプロバイダーとして登録
    // TODO: ここで実際のプロバイダーインスタンスを作成・登録
    // registry.registerProvider(new OpenAIProvider(whisperConfig));
    // registry.registerProvider(new AmiVoiceProvider(amivoiceConfig));
    
    return registry;
  }, []);

  // 利用可能なプロバイダー情報を取得
  const getAvailableProviders = useCallback((): ProviderInfo[] => {
    try {
      const registry = createProviderRegistry();
      return registry.getAllProviderInfos();
    } catch (err) {
      console.error('[useMultiAPITranscription] Failed to get providers:', err);
      return [];
    }
  }, [createProviderRegistry]);

  // 複数プロバイダーで並列実行
  const transcribeWithMultipleProviders = useCallback(async (
    audioFile: AudioFile,
    providerIds?: string[]
  ): Promise<MultiAPIResult> => {
    const providersToUse = providerIds || selectedProviderIds;
    
    if (providersToUse.length === 0) {
      throw new Error('少なくとも1つのプロバイダーを選択してください');
    }

    console.log('[useMultiAPITranscription] Starting multi-provider transcription', {
      audioFile: {
        name: audioFile.file.name,
        size: audioFile.size,
        format: audioFile.format
      },
      providerIds: providersToUse
    });

    setIsProcessing(true);
    setError(null);

    try {
      const registry = createProviderRegistry();
      const result = await registry.transcribeWithMultipleProviders(audioFile, providersToUse);
      
      console.log('[useMultiAPITranscription] Multi-provider transcription completed', {
        totalResults: result.results.length,
        errors: result.errors.length,
        completedCount: result.completedCount,
        totalCount: result.totalCount
      });

      setResults(prev => [...prev, result]);
      return result;
    } catch (err) {
      console.error('[useMultiAPITranscription] Multi-provider transcription failed:', err);
      const errorInfo = handleError(err);
      setError(errorInfo);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [selectedProviderIds, createProviderRegistry, handleError]);

  // 単一プロバイダーで詳細実行
  const transcribeWithProvider = useCallback(async (
    audioFile: AudioFile,
    providerId: string
  ): Promise<EnhancedTranscriptionResult> => {
    console.log('[useMultiAPITranscription] Starting single provider transcription', {
      audioFile: audioFile.file.name,
      providerId
    });

    setIsProcessing(true);
    setError(null);

    try {
      const registry = createProviderRegistry();
      const provider = registry.getProvider(providerId);
      
      if (!provider) {
        throw new Error(`Provider not found: ${providerId}`);
      }

      const result = await provider.transcribeWithDetails(audioFile);
      
      console.log('[useMultiAPITranscription] Single provider transcription completed', {
        providerId,
        resultId: result.id,
        success: result.apiCallDetails.success
      });

      return result;
    } catch (err) {
      console.error('[useMultiAPITranscription] Single provider transcription failed:', err);
      const errorInfo = handleError(err);
      setError(errorInfo);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [createProviderRegistry, handleError]);

  // 結果管理
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const removeResult = useCallback((index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getLatestResult = useCallback((): MultiAPIResult | null => {
    if (results.length === 0) return null;
    return results[results.length - 1];
  }, [results]);

  const getResultsByProvider = useCallback((providerId: string): EnhancedTranscriptionResult[] => {
    return results.flatMap(result => 
      result.results.filter(r => r.apiId === providerId)
    );
  }, [results]);

  // プロバイダー選択の管理
  const toggleProviderSelection = useCallback((providerId: string) => {
    setSelectedProviderIds(prev => 
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  }, []);

  const selectAllProviders = useCallback(() => {
    const allProviders = getAvailableProviders();
    setSelectedProviderIds(allProviders.map(p => p.id));
  }, [getAvailableProviders]);

  const clearProviderSelection = useCallback(() => {
    setSelectedProviderIds([]);
  }, []);

  return {
    // 状態
    results,
    isProcessing,
    error,
    selectedProviderIds,

    // プロバイダー管理
    getAvailableProviders,
    toggleProviderSelection,
    selectAllProviders,
    clearProviderSelection,
    setSelectedProviderIds,

    // 実行
    transcribeWithMultipleProviders,
    transcribeWithProvider,

    // 結果管理
    clearResults,
    removeResult,
    getLatestResult,
    getResultsByProvider,
  };
};