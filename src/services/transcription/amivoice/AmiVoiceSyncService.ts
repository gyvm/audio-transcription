import { TranscriptionService } from '../base/TranscriptionService';
import type { TranscriptionResult, Speaker, TextSegment } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import { ApiError } from '../../../types/common';

// 同期APIのレスポンス型 (非同期のものをベースに調整)
interface AmiVoiceSyncResponse {
  text?: string;
  results?: {
    segments?: Array<{
      startTime: number;
      endTime: number;
      confidence: number;
      text: string;
      speaker?: string;
    }>;
  };
  processingTime?: number;
}

export class AmiVoiceSyncService extends TranscriptionService {
  // 同期APIのエンドポイント (仮) - 後で正しいものに修正が必要
  private readonly baseUrl = 'https://acp-api.amivoice.com/v1/recognitions'; 
  private readonly audioLengthLimitSec = 60; // 60秒の制限

  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    console.log('[AmiVoiceSync] Starting transcription process', {
      fileName: audioFile.file.name,
      fileSize: audioFile.size,
    });

    try {
      // ファイルの長さをチェック
      if (audioFile.duration > this.audioLengthLimitSec) {
        throw new Error(`AmiVoice (同期) は${this.audioLengthLimitSec}秒以下の音声ファイルのみ対応しています。`);
      }
      
      this.validateFile(audioFile);
      console.log('[AmiVoiceSync] File validation passed');

      const { result: response, time: processingTime } = await this.measureProcessingTime(
        () => this.recognize(audioFile)
      );
      console.log('[AmiVoiceSync] Recognition completed', { processingTime, response });

      const result = this.convertToTranscriptionResult(response, processingTime);
      console.log('[AmiVoiceSync] Transcription result created');

      return result;
    } catch (error) {
      console.error('[AmiVoiceSync] Transcription failed:', error);
      throw error;
    }
  }

  private async recognize(audioFile: AudioFile): Promise<AmiVoiceSyncResponse> {
    const optionsString = this.buildOptionsString();
    
    const formData = new FormData();
    formData.append('u', this.config.apiKey);
    formData.append('d', optionsString);
    formData.append('a', audioFile.file, audioFile.file.name);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new ApiError(`AmiVoice (同期) APIエラー: ${response.status} ${response.statusText}`, {
          request: { url: this.baseUrl, method: 'POST' },
          response: { status: response.status, statusText: response.statusText, body: errorText },
        });
      }

      return await response.json();
    } catch (error) {
      console.error('[AmiVoiceSync] Recognition error:', error);
      throw error;
    }
  }

  private buildOptionsString(): string {
    const options = ['grammarFileNames=-a-general', 'loggingOptOut=True'];
    if (this.config.supportsSpeakerDiarization) {
      options.push('speakerDiarization=True');
    }
    return options.join(' ');
  }

  private convertToTranscriptionResult(
    response: AmiVoiceSyncResponse, 
    processingTime: number
  ): TranscriptionResult {
    const speakers = new Map<string, Speaker>();
    const segments: TextSegment[] = [];

    if (response.results?.segments) {
      response.results.segments.forEach((segment) => {
        const speakerId = segment.speaker || 'unknown';
        
        if (!speakers.has(speakerId)) {
          speakers.set(speakerId, {
            id: speakerId,
            name: speakerId === 'unknown' ? '話者不明' : `話者${speakerId}`,
            segments: [],
          });
        }

        const textSegment: TextSegment = {
          text: segment.text,
          startTime: segment.startTime,
          endTime: segment.endTime,
          confidence: segment.confidence || 0,
          speakerId: speakerId,
        };
        
        segments.push(textSegment);
        speakers.get(speakerId)!.segments.push(textSegment);
      });
    }

    return {
      id: this.generateId(),
      serviceName: this.config.displayName,
      text: response.text || '',
      speakers: Array.from(speakers.values()),
      confidence: this.calculateAverageConfidence(segments),
      processingTime,
      timestamp: new Date(),
      metadata: {
        audioLength: segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0,
        audioFormat: 'unknown',
        language: 'ja',
        model: 'amivoice-sync-general',
        apiVersion: 'v1',
      },
    };
  }

  private calculateAverageConfidence(segments: TextSegment[]): number {
    if (segments.length === 0) return 0;
    
    const totalConfidence = segments.reduce((sum, segment) => sum + (segment.confidence || 0), 0);
    return totalConfidence / segments.length;
  }
}