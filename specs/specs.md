# 音声文字起こしサービス設計書

## 概要

複数の文字起こしサービス（OpenAI Whisper等）を統合的に利用し、結果を比較できるWebアプリケーションの設計書です。

## 要件定義

### 機能要件

- MP3音声ファイル（10分以内）のアップロード
- OpenAI Whisper APIを使用した文字起こし
- 話者分離機能（APIが対応している場合）
- 複数の文字起こしサービスの追加対応
- 結果の画面表示

### 非機能要件

- フロントエンドのみの構成
- 低コストでの運用
- 高い拡張性（新サービス追加が容易）
- レスポンス時間は制約なし

## システムアーキテクチャ

### 技術スタック

- **フロントエンド**: React + TypeScript
- **状態管理**: React Hooks（useState, useContext）
- **HTTP通信**: fetch API
- **スタイリング**: CSS Modules または Tailwind CSS
- **ビルドツール**: Vite
- **デプロイ**: Netlify/Vercel
- ツールはmiseで管理する
    - https://mise.jdx.dev/dev-tools/

### アーキテクチャパターン

- **レイヤードアーキテクチャ**
- **Dependency Injection**パターンによるサービス管理
- **Strategy**パターンによる文字起こしサービス切り替え

## ディレクトリ構成

```
src/
├── components/           # UIコンポーネント
│   ├── common/          # 共通コンポーネント
│   │   ├── Button.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── audio/           # 音声関連コンポーネント
│   │   ├── AudioUploader.tsx
│   │   ├── AudioPreview.tsx
│   │   └── FileValidation.tsx
│   ├── transcription/   # 文字起こし関連コンポーネント
│   │   ├── ServiceSelector.tsx
│   │   ├── TranscriptionResult.tsx
│   │   ├── SpeakerSegment.tsx
│   │   └── ComparisonView.tsx
│   └── layout/          # レイアウトコンポーネント
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── MainLayout.tsx
├── services/            # ビジネスロジック
│   ├── transcription/   # 文字起こしサービス
│   │   ├── base/
│   │   │   ├── TranscriptionService.ts
│   │   │   └── types.ts
│   │   ├── whisper/
│   │   │   ├── WhisperService.ts
│   │   │   ├── WhisperTypes.ts
│   │   │   └── WhisperConfig.ts
│   │   ├── google/      # 将来実装
│   │   │   └── GoogleSpeechService.ts
│   │   └── index.ts     # サービス登録
│   ├── audio/           # 音声処理
│   │   ├── AudioProcessor.ts
│   │   ├── FileValidator.ts
│   │   └── AudioUtils.ts
│   └── di/              # DI設定
│       ├── Container.ts
│       ├── ServiceRegistry.ts
│       └── types.ts
├── hooks/               # カスタムフック
│   ├── useTranscription.ts
│   ├── useAudioUpload.ts
│   ├── useServiceSelector.ts
│   └── useErrorHandler.ts
├── types/               # 型定義
│   ├── transcription.ts
│   ├── audio.ts
│   ├── api.ts
│   └── common.ts
├── utils/               # ユーティリティ
│   ├── constants.ts
│   ├── formatters.ts
│   └── validators.ts
├── config/              # 設定
│   ├── env.ts
│   ├── api.ts
│   └── services.ts
├── styles/              # スタイル
│   ├── globals.css
│   ├── components/
│   └── variables.css
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## 詳細設計

### 型定義

#### 基本型定義（types/transcription.ts）

```typescript
// 文字起こし結果の基本型
export interface TranscriptionResult {
  id: string;
  serviceName: string;
  text: string;
  speakers?: Speaker[];
  confidence?: number;
  processingTime: number;
  timestamp: Date;
  metadata?: TranscriptionMetadata;
}

// 話者情報
export interface Speaker {
  id: string;
  name?: string;
  segments: TextSegment[];
}

// テキストセグメント
export interface TextSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  speakerId?: string;
}

// メタデータ
export interface TranscriptionMetadata {
  audioLength: number;
  audioFormat: string;
  language: string;
  model?: string;
  apiVersion?: string;
}

// サービス設定
export interface ServiceConfig {
  name: string;
  displayName: string;
  apiKey: string;
  endpoint: string;
  supportsSpeakerDiarization: boolean;
  maxFileSizeBytes: number;
  maxDurationSeconds: number;
  supportedFormats: string[];
}
```

#### 音声関連型定義（types/audio.ts）

```typescript
// 音声ファイル情報
export interface AudioFile {
  file: File;
  duration?: number;
  size: number;
  format: string;
  isValid: boolean;
  validationErrors?: string[];
}

// 音声処理設定
export interface AudioProcessingConfig {
  maxSizeBytes: number;
  maxDurationSeconds: number;
  supportedFormats: string[];
  enableCompression: boolean;
}
```

### サービス層設計

#### 抽象基底クラス（services/transcription/base/TranscriptionService.ts）

```typescript
export abstract class TranscriptionService {
  protected config: ServiceConfig;
  
  constructor(config: ServiceConfig) {
    this.config = config;
  }

  // メイン処理メソッド
  abstract transcribe(audioFile: AudioFile): Promise<TranscriptionResult>;
  
  // バリデーション
  protected validateFile(audioFile: AudioFile): void {
    if (!audioFile.isValid) {
      throw new Error('Invalid audio file');
    }
    
    if (audioFile.size > this.config.maxFileSizeBytes) {
      throw new Error('File size exceeds limit');
    }
    
    if (!this.config.supportedFormats.includes(audioFile.format)) {
      throw new Error('Unsupported file format');
    }
  }

  // 共通ユーティリティ
  protected generateId(): string {
    return `${this.config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected measureProcessingTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = Date.now();
    return operation().then(result => ({
      result,
      time: Date.now() - start
    }));
  }
}
```

#### Whisper実装（services/transcription/whisper/WhisperService.ts）

```typescript
export class WhisperService extends TranscriptionService {
  private readonly API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    this.validateFile(audioFile);

    const { result, time } = await this.measureProcessingTime(async () => {
      const formData = new FormData();
      formData.append('file', audioFile.file);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');
      
      // 話者分離が有効な場合
      if (this.config.supportsSpeakerDiarization) {
        formData.append('speaker_diarization', 'true');
      }

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.statusText}`);
      }

      return await response.json();
    });

    return this.formatResult(result, time, audioFile);
  }

  private formatResult(apiResponse: any, processingTime: number, audioFile: AudioFile): TranscriptionResult {
    const segments: TextSegment[] = apiResponse.segments?.map((segment: any) => ({
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      confidence: segment.avg_logprob,
    })) || [];

    // 話者分離結果の処理（APIが対応している場合）
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
        language: apiResponse.language || 'ja',
        model: 'whisper-1',
        apiVersion: 'v1',
      },
    };
  }

  private extractSpeakers(apiResponse: any): Speaker[] | undefined {
    // Whisper APIの話者分離結果を処理
    // 実際のAPIレスポンス形式に応じて実装
    if (!apiResponse.speakers) return undefined;

    const speakerMap = new Map<string, TextSegment[]>();
    
    apiResponse.segments?.forEach((segment: any) => {
      const speakerId = segment.speaker || 'unknown';
      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, []);
      }
      speakerMap.get(speakerId)?.push({
        text: segment.text,
        startTime: segment.start,
        endTime: segment.end,
        confidence: segment.avg_logprob,
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
}
```

### DI コンテナ設計（services/di/Container.ts）

```typescript
type ServiceConstructor<T> = new (config: ServiceConfig) => T;

export class DIContainer {
  private services = new Map<string, TranscriptionService>();
  private serviceConfigs = new Map<string, ServiceConfig>();

  // サービス登録
  registerService<T extends TranscriptionService>(
    name: string,
    constructor: ServiceConstructor<T>,
    config: ServiceConfig
  ): void {
    this.serviceConfigs.set(name, config);
    const instance = new constructor(config);
    this.services.set(name, instance);
  }

  // サービス取得
  getService(name: string): TranscriptionService {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service;
  }

  // 利用可能サービス一覧
  getAvailableServices(): Array<{ name: string; config: ServiceConfig }> {
    return Array.from(this.serviceConfigs.entries()).map(([name, config]) => ({
      name,
      config,
    }));
  }

  // サービス設定更新
  updateServiceConfig(name: string, newConfig: Partial<ServiceConfig>): void {
    const currentConfig = this.serviceConfigs.get(name);
    if (!currentConfig) {
      throw new Error(`Service '${name}' not found`);
    }

    const updatedConfig = { ...currentConfig, ...newConfig };
    this.serviceConfigs.set(name, updatedConfig);
    
    // サービスインスタンスを再作成
    const ServiceClass = this.services.get(name)?.constructor as ServiceConstructor<TranscriptionService>;
    const newInstance = new ServiceClass(updatedConfig);
    this.services.set(name, newInstance);
  }
}
```

### カスタムフック設計

#### useTranscription.ts

```typescript
export const useTranscription = () => {
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('whisper');

  const container = useContext(DIContainerContext);

  const transcribe = useCallback(async (audioFile: AudioFile) => {
    setIsProcessing(true);
    setError(null);

    try {
      const service = container.getService(selectedService);
      const result = await service.transcribe(audioFile);
      
      setResults(prev => [...prev, result]);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [container, selectedService]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const removeResult = useCallback((id: string) => {
    setResults(prev => prev.filter(result => result.id !== id));
  }, []);

  return {
    results,
    isProcessing,
    error,
    selectedService,
    setSelectedService,
    transcribe,
    clearResults,
    removeResult,
  };
};
```

#### useAudioUpload.ts

```typescript
export const useAudioUpload = () => {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateAudioFile = useCallback((file: File): AudioFile => {
    const errors: string[] = [];
    
    // ファイル形式チェック
    if (!file.type.includes('mp3') && !file.name.toLowerCase().endsWith('.mp3')) {
      errors.push('MP3形式のファイルのみサポートしています');
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('ファイルサイズが10MBを超えています');
    }

    return {
      file,
      size: file.size,
      format: 'mp3',
      isValid: errors.length === 0,
      validationErrors: errors.length > 0 ? errors : undefined,
    };
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setUploadError(null);
    
    try {
      const audioFileInfo = validateAudioFile(file);
      setAudioFile(audioFileInfo);
      
      if (!audioFileInfo.isValid) {
        setUploadError(audioFileInfo.validationErrors?.join(', ') || 'Invalid file');
      }
    } catch (error) {
      setUploadError('ファイルの処理中にエラーが発生しました');
    }
  }, [validateAudioFile]);

  const clearFile = useCallback(() => {
    setAudioFile(null);
    setUploadError(null);
  }, []);

  return {
    audioFile,
    isDragOver,
    uploadError,
    setIsDragOver,
    handleFileSelect,
    clearFile,
  };
};
```

### コンポーネント設計

#### AudioUploader.tsx

```typescript
interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  isDragOver: boolean;
  onDragOver: (isDragOver: boolean) => void;
  error?: string | null;
  disabled?: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelect,
  isDragOver,
  onDragOver,
  error,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(true);
  }, [onDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
  }, [onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => 
      file.type.includes('mp3') || file.name.toLowerCase().endsWith('.mp3')
    );

    if (audioFile) {
      onFileSelect(audioFile);
    }
  }, [onFileSelect, onDragOver]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className={`audio-uploader ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}>
      <div
        className="upload-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,audio/mp3"
          onChange={handleFileInputChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />
        
        <div className="upload-content">
          <UploadIcon />
          <p>MP3ファイルをドラッグ&ドロップするか、クリックして選択</p>
          <p className="file-info">最大10分、10MBまで</p>
        </div>
      </div>
      
      {error && <ErrorMessage message={error} />}
    </div>
  );
};
```

#### TranscriptionResult.tsx

```typescript
interface TranscriptionResultProps {
  result: TranscriptionResult;
  onRemove?: () => void;
  showComparison?: boolean;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({
  result,
  onRemove,
  showComparison = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="transcription-result">
      <div className="result-header">
        <div className="service-info">
          <h3>{result.serviceName}</h3>
          <span className="processing-time">
            処理時間: {result.processingTime}ms
          </span>
          {result.confidence && (
            <span className="confidence">
              信頼度: {(result.confidence * 100).toFixed(1)}%
            </span>
          )}
        </div>
        
        <div className="result-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '折りたたむ' : '詳細表示'}
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="remove-button"
            >
              削除
            </Button>
          )}
        </div>
      </div>

      <div className="result-content">
        <div className="main-text">
          <h4>文字起こし結果</h4>
          <p>{result.text}</p>
        </div>

        {isExpanded && (
          <>
            {result.speakers && result.speakers.length > 0 && (
              <div className="speaker-segments">
                <h4>話者別セグメント</h4>
                {result.speakers.map(speaker => (
                  <SpeakerSegment
                    key={speaker.id}
                    speaker={speaker}
                  />
                ))}
              </div>
            )}

            <div className="metadata">
              <h4>メタデータ</h4>
              <dl>
                <dt>音声長:</dt>
                <dd>{result.metadata?.audioLength}秒</dd>
                <dt>処理日時:</dt>
                <dd>{result.timestamp.toLocaleString()}</dd>
                <dt>言語:</dt>
                <dd>{result.metadata?.language}</dd>
                {result.metadata?.model && (
                  <>
                    <dt>モデル:</dt>
                    <dd>{result.metadata.model}</dd>
                  </>
                )}
              </dl>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

## 環境設定

### 環境変数（.env）

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_APP_NAME=音声文字起こしサービス
VITE_MAX_FILE_SIZE_MB=10
VITE_MAX_DURATION_MINUTES=10
```

### Vite設定（vite.config.ts）

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    // 環境変数の型安全性を確保
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['@/utils'],
        },
      },
    },
  },
});
```

## エラーハンドリング

### エラー型定義

```typescript
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export const ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
```

### エラーハンドラー

```typescript
export const errorHandler = (error: unknown): TranscriptionError => {
  if (error instanceof TranscriptionError) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new TranscriptionError(
      'ネットワークエラーが発生しました',
      ERROR_CODES.NETWORK_ERROR,
      error
    );
  }

  return new TranscriptionError(
    '予期しないエラーが発生しました',
    ERROR_CODES.UNKNOWN_ERROR,
    error
  );
};
```

## テスト戦略

### 単体テスト

- **サービスクラス**: 各TranscriptionServiceの実装
- **ユーティリティ関数**: バリデーション、フォーマット処理
- **カスタムフック**: useTranscription, useAudioUpload

### 統合テスト

- **API連携**: モックAPI使用
- **ファイルアップロード**: ダミーファイル使用
- **エラーハンドリング**: 異常系のテスト

### E2Eテスト

- **基本フロー**: ファイルアップロード → 文字起こし → 結果表示
- **エラーケース**: 不正ファイル、API エラー

## デプロイメント

### 本番環境設定

- **Netlify/Vercel** での静的サイトホスティング
- **環境変数** の設定
- **ビルド最適化** の設定

### セキュリティ考慮事項

- APIキーの適切な管理
- ファイルアップロードのセキュリティ
- XSS、CSRF対策

## 今後の拡張計画

### フェーズ1（MVP）

- [x] 基本的な文字起こし機能（Whisper）
- [x] ファイルアップロード
- [x] 結果表示

### フェーズ2

- [ ] Google Speech-to-Text API対応
- [ ] Amazon Transcribe対応
- [ ] 結果比較機能の強化

### フェーズ3

- [ ] 結果のエクスポート機能
- [ ] 音声ファイルの前処理機能
- [ ] 管理画面の追加

この設計書に基づいて実装を進めていただき、必要に応じて詳細を調整してください。
