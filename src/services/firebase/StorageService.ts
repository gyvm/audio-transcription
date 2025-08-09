import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
} from 'firebase/storage';
import type {
  FirebaseStorage,
  UploadTask,
} from 'firebase/storage';
import { getFirebaseConfig } from '../../config/firebase';
import type { AudioFile } from '../../types/audio';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
  state: 'running' | 'paused' | 'success' | 'error';
}

export interface UploadResult {
  downloadURL: string;
  gcsUri: string; // Google Cloud Storage URI (gs://bucket/path)
  fullPath: string;
  name: string;
  size: number;
}

export class StorageService {
  private app: FirebaseApp;
  private storage: FirebaseStorage;
  private onProgressCallback?: (progress: UploadProgress) => void;

  constructor() {
    this.app = this.initializeFirebaseApp();
    this.storage = getStorage(this.app);
  }

  private initializeFirebaseApp(): FirebaseApp {
    const config = getFirebaseConfig();
    if (!config) {
      throw new Error('Firebase configuration is not available');
    }

    // すでに初期化されている場合は既存のアプリを使用
    const existingApps = getApps();
    if (existingApps.length > 0) {
      return existingApps[0];
    }

    return initializeApp(config);
  }

  /**
   * 進行状況コールバックを設定
   */
  setProgressCallback(callback: (progress: UploadProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * 音声ファイルをCloud Storageにアップロード
   */
  async uploadAudio(audioFile: AudioFile): Promise<UploadResult> {
    const fileName = this.generateFileName(audioFile.file.name);
    const storageRef = ref(this.storage, `audio-files/${fileName}`);

    return new Promise((resolve, reject) => {
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, audioFile.file);

      uploadTask.on('state_changed',
        (snapshot) => {
          // 進行状況を計算
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            state: snapshot.state as any
          };

          // コールバック呼び出し
          if (this.onProgressCallback) {
            this.onProgressCallback(progress);
          }

          console.log(`Upload progress: ${progress.progress}%`);
        },
        (error) => {
          console.error('Upload failed:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          try {
            // アップロード完了、ダウンロードURLを取得
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // GCS URI形式を生成 (gs://bucket/path)
            // Firebase Storageのバケット名をそのまま使用
            const gcsUri = `gs://${uploadTask.snapshot.ref.bucket}/${uploadTask.snapshot.ref.fullPath}`;
            
            console.log('[StorageService] Generated GCS URI:', gcsUri);
            console.log('[StorageService] Bucket name:', uploadTask.snapshot.ref.bucket);
            
            const result: UploadResult = {
              downloadURL,
              gcsUri,
              fullPath: uploadTask.snapshot.ref.fullPath,
              name: uploadTask.snapshot.ref.name,
              size: uploadTask.snapshot.totalBytes
            };

            console.log('Upload completed:', result);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * アップロードしたファイルを削除
   */
  async deleteFile(fullPath: string): Promise<void> {
    try {
      const fileRef = ref(this.storage, fullPath);
      await deleteObject(fileRef);
      console.log('File deleted successfully:', fullPath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * 一意のファイル名を生成
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop() || 'wav';
    return `${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Firebase Storageが利用可能かチェック
   */
  static isAvailable(): boolean {
    try {
      return getFirebaseConfig() !== null;
    } catch {
      return false;
    }
  }

  /**
   * ストレージ使用量の概算を取得（実装例）
   */
  async getStorageUsage(): Promise<number> {
    // Firebase には直接的なストレージ使用量取得APIがないため、
    // 必要に応じてファイル一覧を取得して計算する
    // ここでは簡単な実装例のみ提供
    console.warn('Storage usage calculation not implemented');
    return 0;
  }
}