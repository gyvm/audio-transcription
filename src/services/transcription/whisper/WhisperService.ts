import { TranscriptionService } from '../base/TranscriptionService';
import type { TranscriptionResult, Speaker, TextSegment } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';
import type { WhisperApiResponse, WhisperApiSegment } from './WhisperTypes';
import { WHISPER_MODELS, WHISPER_RESPONSE_FORMATS } from './WhisperConfig';

export class WhisperService extends TranscriptionService {
  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    this.validateFile(audioFile);

    const { result, time } = await this.measureProcessingTime(async () => {
      const formData = new FormData();
      formData.append('file', audioFile.file);
      formData.append('model', WHISPER_MODELS.WHISPER_1);
      formData.append('response_format', WHISPER_RESPONSE_FORMATS.VERBOSE_JSON);
      formData.append('timestamp_granularities[]', 'segment');
      
      if (this.config.supportsSpeakerDiarization) {
        formData.append('speaker_diarization', 'true');
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Whisper API error (${response.status}): ${errorText}`);
      }

      return await response.json() as WhisperApiResponse;
    });

    return this.formatResult(result, time, audioFile);
  }

  private formatResult(apiResponse: WhisperApiResponse, processingTime: number, audioFile: AudioFile): TranscriptionResult {
    const segments: TextSegment[] = apiResponse.segments?.map((segment: WhisperApiSegment) => ({
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      confidence: this.convertLogProbToConfidence(segment.avg_logprob),
    })) || [];

    const speakers = this.extractSpeakers(apiResponse);

    return {
      id: this.generateId(),
      serviceName: this.config.name,
      text: apiResponse.text,
      speakers,
      confidence: this.calculateOverallConfidence(segments),
      processingTime,
      timestamp: new Date(),
      metadata: {
        audioLength: apiResponse.duration || 0,
        audioFormat: audioFile.format,
        language: apiResponse.language || 'unknown',
        model: WHISPER_MODELS.WHISPER_1,
        apiVersion: 'v1',
      },
    };
  }

  private extractSpeakers(apiResponse: WhisperApiResponse): Speaker[] | undefined {
    if (!apiResponse.speakers || !apiResponse.segments) return undefined;

    const speakerMap = new Map<string, TextSegment[]>();
    
    apiResponse.segments.forEach((segment: WhisperApiSegment) => {
      const speakerId = segment.speaker || 'unknown';
      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, []);
      }
      speakerMap.get(speakerId)?.push({
        text: segment.text,
        startTime: segment.start,
        endTime: segment.end,
        confidence: this.convertLogProbToConfidence(segment.avg_logprob),
        speakerId,
      });
    });

    return Array.from(speakerMap.entries()).map(([id, segments]) => ({
      id,
      name: `話者${id}`,
      segments,
    }));
  }

  private calculateOverallConfidence(segments: TextSegment[]): number {
    if (segments.length === 0) return 0;
    const total = segments.reduce((sum, segment) => sum + (segment.confidence || 0), 0);
    return total / segments.length;
  }

  private convertLogProbToConfidence(logProb: number): number {
    return Math.exp(logProb);
  }
}