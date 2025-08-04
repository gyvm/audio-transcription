import { TranscriptionService } from '../base/TranscriptionService';
import type { TranscriptionResult } from '../../../types/transcription';
import type { AudioFile } from '../../../types/audio';

export class GoogleSpeechService extends TranscriptionService {
  async transcribe(_audioFile: AudioFile): Promise<TranscriptionResult> {
    throw new Error('GoogleSpeechService not implemented yet');
  }
}