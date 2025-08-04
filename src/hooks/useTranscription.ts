import { useState, useCallback, useContext, createContext } from 'react';
import type { TranscriptionResult } from '../types/transcription';
import type { AudioFile } from '../types/audio';
import { DIContainer } from '../services/di/Container';
import { useErrorHandler } from './useErrorHandler';

export const DIContainerContext = createContext<DIContainer | null>(null);

export const useTranscription = () => {
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('whisper');

  const container = useContext(DIContainerContext);
  const { handleError } = useErrorHandler();

  if (!container) {
    throw new Error('useTranscription must be used within a DIContainerProvider');
  }

  const transcribe = useCallback(async (audioFile: AudioFile, serviceName?: string): Promise<TranscriptionResult> => {
    const serviceToUse = serviceName || selectedService;
    setIsProcessing(true);
    setError(null);

    try {
      const service = container.getService(serviceToUse);
      const result = await service.transcribe(audioFile);
      
      setResults(prev => [...prev, result]);
      return result;
    } catch (err) {
      const errorInfo = handleError(err);
      setError(errorInfo.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [container, selectedService, handleError]);

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
      const errorInfo = handleError(err);
      setError(errorInfo.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [container, handleError]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const removeResult = useCallback((id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  }, []);

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