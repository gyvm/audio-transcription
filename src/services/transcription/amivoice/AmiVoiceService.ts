import { TranscriptionService } from '../base/TranscriptionService';
import type { TranscriptionResult, Speaker, TextSegment } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import { ApiError } from '../../../types/common';

interface AmiVoiceSegment {
  startTime: number;
  endTime: number;
  confidence: number;
  text: string;
  speaker?: string;
}

interface AmiVoiceResponse {
  sessionid: string;
  status: 'PROCESSING' | 'COMPLETED' | 'ERROR';
  text?: string;
  results?: {
    segments?: AmiVoiceSegment[];
  };
  processingTime?: number;
}

export class AmiVoiceService extends TranscriptionService {
  private readonly baseUrl = 'https://acp-api-async.amivoice.com/v2/recognitions';
  private readonly maxRetries = 300;
  private readonly retryInterval = 5000; // 5秒

  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    console.log('[AmiVoice] Starting transcription process', {
      fileName: audioFile.file.name,
      fileSize: audioFile.size,
      format: audioFile.format,
      isValid: audioFile.isValid
    });

    let requestData: Record<string, unknown> = {};
    let responseData: AmiVoiceResponse;

    try {
      this.validateFile(audioFile);
      console.log('[AmiVoice] File validation passed');

      requestData = {
        endpoint: this.baseUrl,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey.substring(0, 10)}...`
        },
        body: {
          filename: audioFile.file.name,
          fileSize: audioFile.file.size,
          options: this.buildOptionsString(),
        },
        processingType: 'async-polling'
      };

      const { result: sessionId, time: uploadTime } = await this.measureProcessingTime(
        () => this.uploadAudio(audioFile)
      );
      console.log('[AmiVoice] Upload completed', { sessionId, uploadTime });

      const { result: response, time: processingTime } = await this.measureProcessingTime(
        () => this.pollForResult(sessionId)
      );
      console.log('[AmiVoice] Processing completed', { processingTime, response });

      responseData = response;
      const result = this.convertToTranscriptionResult(response, uploadTime + processingTime, requestData, responseData);
      console.log('[AmiVoice] Transcription result created', {
        resultId: result.id,
        textLength: result.text.length,
        segmentsCount: result.speakers?.reduce((count, speaker) => count + speaker.segments.length, 0) || 0,
        speakersCount: result.speakers?.length || 0
      });

      return result;
    } catch (error) {
      console.error('[AmiVoice] Transcription failed:', error);
      throw error;
    }
  }

  private async uploadAudio(audioFile: AudioFile): Promise<string> {
    const optionsString = this.buildOptionsString();
    console.log('[AmiVoice] Preparing upload', {
      url: this.baseUrl,
      fileName: audioFile.file.name,
      fileSize: audioFile.file.size,
      options: optionsString,
      hasApiKey: !!this.config.apiKey
    });

    const formData = new FormData();
    formData.append('u', this.config.apiKey);
    formData.append('d', optionsString);
    formData.append('a', audioFile.file, audioFile.file.name);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('[AmiVoice] Upload response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('[AmiVoice] Upload error response:', errorText);
        throw new ApiError(`AmiVoice upload failed: ${response.status} ${response.statusText}`, {
          request: {
            url: this.baseUrl,
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
            body: `FormData with file: ${audioFile.file.name}`
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          }
        });
      }

      const data = await response.json();
      console.log('[AmiVoice] Upload response data:', data);
      
      if (!data.sessionid) {
        console.error('[AmiVoice] No session ID in response:', data);
        throw new Error('AmiVoice upload failed: No session ID returned');
      }

      return data.sessionid;
    } catch (error) {
      console.error('[AmiVoice] Upload error:', error);
      throw error;
    }
  }

  private buildOptionsString(): string {
    const options = [
      'grammarFileNames=-a-general',
      'loggingOptOut=True'
    ];

    // 話者分離が有効な場合
    if (this.config.supportsSpeakerDiarization) {
      options.push('speakerDiarization=True');
    }

    return options.join(' ');
  }

  private async pollForResult(sessionId: string): Promise<AmiVoiceResponse> {
    const resultUrl = `${this.baseUrl}/${sessionId}`;
    console.log('[AmiVoice] Starting result polling', { sessionId, resultUrl, maxRetries: this.maxRetries });
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      console.log(`[AmiVoice Polling] Attempt ${attempt + 1}/${this.maxRetries} for session: ${sessionId}`);
      
      try {
        const response = await fetch(resultUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        });

        console.log('[AmiVoice] Poll response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.error('[AmiVoice] Poll error response:', errorText);
          throw new ApiError(`AmiVoice result fetch failed: ${response.status} ${response.statusText}`, {
            request: {
              url: resultUrl,
              method: 'GET',
              headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            }
          });
        }

        const data: AmiVoiceResponse = await response.json();
        console.log(`[AmiVoice Polling] Status: ${data.status}, HasResult: ${!!data.text}`);

        if (data.status.toUpperCase() === 'ERROR') {
          console.error('[AmiVoice] Transcription returned ERROR status:', data);
          throw new Error('AmiVoice transcription failed');
        }

        if (data.status.toUpperCase() === 'COMPLETED') {
          console.log('[AmiVoice] Transcription completed successfully');
          return data;
        }

        // まだ処理中の場合は待機
        if (attempt < this.maxRetries - 1) {
          console.log(`[AmiVoice] Status: ${data.status}, waiting ${this.retryInterval}ms before next attempt`);
          await new Promise(resolve => setTimeout(resolve, this.retryInterval));
        }
      } catch (error) {
        console.error(`[AmiVoice] Error on polling attempt ${attempt + 1}:`, error);
        if (attempt === this.maxRetries - 1) {
          throw error;
        }
        // エラーが発生した場合も少し待機してリトライ
        await new Promise(resolve => setTimeout(resolve, this.retryInterval));
      }
    }

    console.error('[AmiVoice] Transcription timeout after', this.maxRetries, 'attempts');
    throw new Error('AmiVoice transcription timeout');
  }

  private convertToTranscriptionResult(
    response: AmiVoiceResponse, 
    processingTime: number,
    requestData?: Record<string, unknown>,
    responseData?: AmiVoiceResponse
  ): TranscriptionResult {
    const speakers = new Map<string, Speaker>();
    const segments: TextSegment[] = [];

    // セグメント情報がある場合
    if (response.results?.segments) {
      response.results.segments.forEach((segment) => {
        const speakerId = segment.speaker || 'unknown';
        
        // 話者情報を登録
        if (!speakers.has(speakerId)) {
          const speakerSegments: TextSegment[] = [];
          speakers.set(speakerId, {
            id: speakerId,
            name: speakerId === 'unknown' ? '話者不明' : `話者${speakerId}`,
            segments: speakerSegments,
          });
        }

        // セグメントを追加
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
        language: 'ja', // AmiVoiceは主に日本語対応
        model: 'amivoice-general',
        apiVersion: 'v2',
      },
      requestData,
      responseData,
    };
  }

  private calculateAverageConfidence(segments: TextSegment[]): number {
    if (segments.length === 0) return 0;
    
    const totalConfidence = segments.reduce((sum, segment) => sum + (segment.confidence || 0), 0);
    return totalConfidence / segments.length;
  }
}