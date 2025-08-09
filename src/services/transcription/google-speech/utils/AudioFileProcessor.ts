import type { AudioFile } from '../../../../types/audio';
import type { GoogleSpeechConfig, AudioFileInfo } from '../GoogleSpeechTypes';
import { FILE_FORMAT_TO_ENCODING, SUPPORTED_ENCODINGS, LIMITS } from '../GoogleSpeechConfig';

export class AudioFileProcessor {
  /**
   * 音声ファイル情報を取得
   */
  static async getAudioInfo(audioFile: AudioFile): Promise<AudioFileInfo> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioFile.file);

      audio.onloadedmetadata = () => {
        // リソースをクリーンアップ
        URL.revokeObjectURL(url);

        const info: AudioFileInfo = {
          duration: audio.duration,
          size: audioFile.file.size,
          encoding: this.getEncodingForFormat(audioFile.format),
          // 以下は推定値（Web Audio APIなしでは正確な取得困難）
          sampleRate: this.estimateSampleRate(audioFile.format),
          channels: this.estimateChannels(audioFile.file.size, audio.duration),
          format: audioFile.format, // ファイル形式も保存
        };

        resolve(info);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio metadata'));
      };

      audio.src = url;
    });
  }

  /**
   * ファイル形式に対応するエンコーディングを取得
   */
  static getEncodingForFormat(format: string): string {
    const formatKey = FILE_FORMAT_TO_ENCODING[format.toLowerCase()];
    const encoding = formatKey ? SUPPORTED_ENCODINGS[formatKey] : 'LINEAR16';
    
    console.log('[AudioFileProcessor] Format:', format, 'FormatKey:', formatKey, 'Encoding:', encoding);
    
    return encoding;
  }

  /**
   * Google Speech設定を生成
   */
  static createSpeechConfig(
    audioInfo: AudioFileInfo, 
    baseConfig: Partial<GoogleSpeechConfig> = {}
  ): GoogleSpeechConfig {
    // ファイル形式からGoogle Speech APIのエンコーディングを決定
    const format = (audioInfo as any).format || 'wav'; // フォールバック
    const encoding = this.getEncodingForFormat(format);
    
    // MP3の場合、サンプルレートの明示的指定が必要
    let sampleRate = audioInfo.sampleRate;
    if (format.toLowerCase() === 'mp3') {
      // MP3の場合、デフォルト44100Hzに設定（推定値が不正確な場合があるため）
      sampleRate = sampleRate || 44100;
    } else {
      sampleRate = sampleRate || 16000;
    }
    
    console.log('[AudioFileProcessor] Final config - Format:', format, 'Encoding:', encoding, 'SampleRate:', sampleRate);
    
    return {
      encoding: encoding as any,
      sampleRateHertz: sampleRate,
      audioChannelCount: audioInfo.channels || 1,
      languageCode: 'ja-JP',
      alternativeLanguageCodes: ['en-US'],
      maxAlternatives: 1,
      enableWordTimeOffsets: true,
      enableWordConfidence: true,
      enableAutomaticPunctuation: true,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        minSpeakerCount: 1,
        maxSpeakerCount: 6,
      },
      ...baseConfig, // ユーザー設定で上書き
    };
  }

  /**
   * 同期処理が可能かチェック
   */
  static canUseSyncProcessing(audioInfo: AudioFileInfo): boolean {
    return audioInfo.duration <= LIMITS.SYNC_MAX_DURATION_SECONDS &&
           audioInfo.size <= LIMITS.SYNC_MAX_FILE_SIZE_BYTES;
  }

  /**
   * ファイルをBase64エンコード
   */
  static async encodeToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        // data:audio/wav;base64, の部分を除去
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to encode file to base64'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * サンプルレートを推定
   */
  private static estimateSampleRate(format: string): number {
    const commonRates: Record<string, number> = {
      'wav': 44100,
      'flac': 44100,
      'mp3': 44100,
      'ogg': 48000,
      'webm': 48000,
      'm4a': 44100,
    };

    return commonRates[format.toLowerCase()] || 16000;
  }

  /**
   * チャンネル数を推定
   */
  private static estimateChannels(fileSize: number, duration: number): number {
    if (duration <= 0) return 1;

    // 大まかな推定: 1分あたり約1MBならモノラル、2MBならステレオ
    const sizePerMinute = (fileSize / (duration / 60)) / (1024 * 1024);
    return sizePerMinute > 1.5 ? 2 : 1;
  }

  /**
   * ファイル検証
   */
  static validateAudioFile(audioFile: AudioFile, audioInfo: AudioFileInfo): void {
    // サイズチェック
    if (audioInfo.duration > LIMITS.SYNC_MAX_DURATION_SECONDS) {
      // 60秒超過の場合、非同期処理必須
      if (audioInfo.size > LIMITS.ASYNC_MAX_FILE_SIZE_BYTES) {
        throw new Error(`File size too large: ${(audioInfo.size / (1024 * 1024 * 1024)).toFixed(2)}GB (max: 1GB)`);
      }
    } else {
      // 同期処理の場合
      if (audioInfo.size > LIMITS.SYNC_MAX_FILE_SIZE_BYTES) {
        throw new Error(`File size too large for sync processing: ${(audioInfo.size / (1024 * 1024)).toFixed(2)}MB (max: 10MB)`);
      }
    }

    // 時間チェック
    if (audioInfo.duration > LIMITS.ASYNC_MAX_DURATION_SECONDS) {
      const maxHours = LIMITS.ASYNC_MAX_DURATION_SECONDS / 3600;
      throw new Error(`Audio duration too long: ${(audioInfo.duration / 3600).toFixed(1)}h (max: ${maxHours}h)`);
    }

    // フォーマットチェック
    const supportedFormats = Object.keys(FILE_FORMAT_TO_ENCODING);
    if (!supportedFormats.includes(audioFile.format.toLowerCase())) {
      throw new Error(`Unsupported audio format: ${audioFile.format} (supported: ${supportedFormats.join(', ')})`);
    }
  }
}