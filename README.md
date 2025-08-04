# 音声文字起こしサービス

複数の文字起こしサービス（OpenAI Whisper等）を統合的に利用し、結果を比較できるWebアプリケーションです。

## 特徴

- 🎤 **音声ファイルアップロード**: MP3, WAV, FLAC, M4A等の音声ファイルに対応
- 🔄 **複数サービス対応**: OpenAI Whisperを使用（将来的に他サービスも追加予定）
- 📊 **結果比較**: 複数の文字起こし結果を比較表示
- 🎯 **話者分離**: サービスが対応している場合、話者別にセグメント表示
- 💻 **フロントエンドのみ**: サーバーレスで動作
- 🎨 **モダンUI**: Tailwind CSSを使用したレスポンシブデザイン

## 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **状態管理**: React Hooks（useState, useContext）
- **HTTP通信**: Fetch API
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **パッケージ管理**: mise

## セットアップ

### 前提条件

- Node.js 20以上
- OpenAI APIキー

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd audio-transcription
```

2. miseでNode.jsをセットアップ（任意）
```bash
mise install
```

3. 依存関係をインストール
```bash
npm install
```

4. 環境変数を設定
```bash
cp .env.example .env
```

`.env`ファイルを編集し、OpenAI APIキーを設定：
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

5. 開発サーバーを起動
```bash
npm run dev
```

## 使用方法

1. **音声ファイルアップロード**
   - ドラッグ&ドロップまたはファイル選択で音声ファイルをアップロード
   - 対応形式: MP3, WAV, FLAC, M4A, MP4, OGG, WebM
   - 最大ファイルサイズ: 10MB（設定変更可能）
   - 最大音声長: 10分（設定変更可能）

2. **文字起こし実行**
   - サービスを選択（現在はOpenAI Whisperのみ）
   - 「文字起こし開始」ボタンをクリック

3. **結果確認**
   - 文字起こし結果をテキスト形式で表示
   - 詳細情報（処理時間、信頼度、メタデータ）を確認
   - 話者分離に対応している場合、話者別セグメントを表示

4. **結果比較**
   - 複数の結果がある場合、比較ビューで並べて表示
   - テキスト類似度を計算して表示

## 設定

環境変数で以下の設定が可能：

```bash
# OpenAI API設定
VITE_OPENAI_API_KEY=your_api_key_here

# アプリケーション設定
VITE_APP_NAME=音声文字起こしサービス
VITE_MAX_FILE_SIZE_MB=10
VITE_MAX_DURATION_MINUTES=10

# 開発設定
VITE_DEV_MODE=true
```

## 開発

### プロジェクト構成

```
src/
├── components/           # UIコンポーネント
│   ├── common/          # 共通コンポーネント
│   ├── audio/           # 音声関連コンポーネント
│   ├── transcription/   # 文字起こし関連コンポーネント
│   └── layout/          # レイアウトコンポーネント
├── services/            # ビジネスロジック
│   ├── transcription/   # 文字起こしサービス
│   ├── audio/           # 音声処理
│   └── di/              # DI設定
├── hooks/               # カスタムフック
├── types/               # 型定義
├── utils/               # ユーティリティ
└── config/              # 設定
```

### アーキテクチャ

- **レイヤードアーキテクチャ**: UI、ビジネスロジック、データ層を分離
- **Dependency Injection**: サービスの依存関係を管理
- **Strategy パターン**: 複数の文字起こしサービスを切り替え可能

### 新しいサービスの追加

1. `src/services/transcription/`に新しいサービスフォルダを作成
2. `TranscriptionService`を継承したクラスを実装
3. `ServiceRegistry`にサービスを登録

例：
```typescript
export class NewService extends TranscriptionService {
  async transcribe(audioFile: AudioFile): Promise<TranscriptionResult> {
    // 実装
  }
}
```

## ビルド

```bash
npm run build
```

## デプロイ

このアプリケーションは静的サイトとしてデプロイできます：

- **Netlify**: `npm run build`の出力をアップロード
- **Vercel**: GitHubリポジトリを連携
- **その他**: `dist/`フォルダの内容を任意のホスティングサービスに配置

環境変数の設定を忘れずに行ってください。

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 今後の予定

- [ ] Google Speech-to-Text API対応
- [ ] Amazon Transcribe対応
- [ ] 結果のエクスポート機能（テキスト、JSON、SRT）
- [ ] 音声ファイルの前処理機能
- [ ] ローカルストレージでの結果保存
- [ ] ダークモード対応