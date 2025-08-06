import { useState, useCallback, useContext, createContext, useEffect } from 'react';
import type { TranscriptionResult } from '../types/transcription';
import type { AudioFile } from '../types/audio';
import { DIContainer } from '../services/di/Container';
import { useErrorHandler } from './useErrorHandler';
import { ResultStorageManager } from '../services/storage';

export const DIContainerContext = createContext<DIContainer | null>(null);

export const useTranscription = () => {
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [storageManager] = useState(() => new ResultStorageManager());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');

  const container = useContext(DIContainerContext);
  const { handleError } = useErrorHandler();

  if (!container) {
    throw new Error('useTranscription must be used within a DIContainerProvider');
  }

  // 初期化時にストレージから結果を読み込み
  useEffect(() => {
    const loadStoredResults = () => {
      try {
        const storedResults = storageManager.loadResults();
        if (storedResults.length > 0) {
          setResults(storedResults);
          console.log(`Loaded ${storedResults.length} results from storage`);
        }
      } catch (error) {
        console.error('Failed to load stored results:', error);
      }
    };

    loadStoredResults();
  }, [storageManager]);

  // 結果が変更された時にストレージに保存
  useEffect(() => {
    if (results.length > 0) {
      try {
        storageManager.saveResults(results);
      } catch (error) {
        console.error('Failed to save results to storage:', error);
      }
    }
  }, [results, storageManager]);

  // 選択されたサービスが空の場合、利用可能な最初のサービスを設定
  const availableServices = container.getAvailableServices();
  if (!selectedService && availableServices.length > 0) {
    setSelectedService(availableServices[0].name);
  }

  const transcribe = useCallback(async (audioFile: AudioFile, serviceName?: string): Promise<TranscriptionResult> => {
    const serviceToUse = serviceName || selectedService;
    
    console.log('[useTranscription] Starting transcription', {
      audioFile: {
        name: audioFile.file.name,
        size: audioFile.size,
        format: audioFile.format,
        isValid: audioFile.isValid
      },
      serviceToUse,
      selectedService,
      availableServices: availableServices.map(s => s.name)
    });

    if (!serviceToUse) {
      const error = 'No transcription service selected';
      console.error('[useTranscription]', error);
      setError(error);
      throw new Error(error);
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('[useTranscription] Getting service:', serviceToUse);
      const service = container.getService(serviceToUse);
      console.log('[useTranscription] Service obtained, starting transcription');
      
      const result = await service.transcribe(audioFile);
      console.log('[useTranscription] Transcription completed successfully');
      
      setResults(prev => [...prev, result]);
      return result;
    } catch (err) {
      console.error('[useTranscription] Transcription failed:', err);
      setError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [container, selectedService, handleError, availableServices]);

  const transcribeWithMultipleServices = useCallback(async (
    audioFile: AudioFile, 
    serviceNames: string[]
  ): Promise<TranscriptionResult[]> => {
    setIsProcessing(true);
    setError(null);

    try {
      const promises = serviceNames.map(async (serviceName) => {
        try {
          const service = container.getService(serviceName);
          return await service.transcribe(audioFile);
        } catch (err) {
          console.error(`Service ${serviceName} failed:`, err);
          throw err;
        }
      });

      const results = await Promise.allSettled(promises);
      const successfulResults: TranscriptionResult[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          const errorInfo = handleError(result.reason);
          errors.push(`${serviceNames[index]}: ${errorInfo.message}`);
        }
      });

      if (successfulResults.length === 0) {
        throw new Error(`すべてのサービスでエラーが発生しました: ${errors.join(', ')}`);
      }

      if (errors.length > 0) {
        console.warn('一部のサービスでエラーが発生しました:', errors);
      }

      setResults(prev => [...prev, ...successfulResults]);
      return successfulResults;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [container, handleError]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    try {
      storageManager.clearResults();
      console.log('Cleared all results from storage');
    } catch (error) {
      console.error('Failed to clear results from storage:', error);
    }
  }, [storageManager]);

  const removeResult = useCallback((id: string) => {
    try {
      const updatedResults = storageManager.removeResult(id);
      setResults(updatedResults);
      console.log(`Removed result ${id} from storage`);
    } catch (error) {
      console.error('Failed to remove result from storage:', error);
      // フォールバック：メモリ上のみ削除
      setResults(prev => prev.filter(result => result.id !== id));
    }
  }, [storageManager]);

  const getResultsByService = useCallback((serviceName: string) => {
    return results.filter(result => result.serviceName === serviceName);
  }, [results]);

  const getLatestResult = useCallback((): TranscriptionResult | null => {
    if (results.length === 0) return null;
    return results[results.length - 1];
  }, [results]);

  return {
    results,
    isProcessing,
    error,
    selectedService,
    setSelectedService,
    transcribe,
    transcribeWithMultipleServices,
    clearResults,
    removeResult,
    getResultsByService,
    getLatestResult,
  };
};