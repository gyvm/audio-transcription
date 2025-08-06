import React, { useState } from 'react';
import { MainLayout } from './components/layout';
import { AudioUploader, AudioPreview, FileValidation } from './components/audio';
import { ServiceSelector, TranscriptionResult, ComparisonView } from './components/transcription';
import { Button, LoadingSpinner, ErrorMessage } from './components/common';
import { SettingsModal } from './components/settings';
import { useAudioUpload, useTranscription, useServiceSelector, DIContainerContext } from './hooks';
import { ServiceRegistry } from './services/di/ServiceRegistry';

const serviceRegistry = new ServiceRegistry();
const container = serviceRegistry.getContainer();

const AppContent: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const {
    audioFile,
    isDragOver,
    uploadError,
    isProcessing: isUploading,
    setIsDragOver,
    handleFileSelect,
    clearFile,
    getFileInfo,
  } = useAudioUpload();


  const {
    results,
    isProcessing: isTranscribing,
    error: transcriptionError,
    transcribe,
    transcribeWithMultipleServices,
    clearResults,
    removeResult,
  } = useTranscription();

  const availableServices = container.getAvailableServices();
  const { selectedServices, toggleService } = useServiceSelector(availableServices);

  // デバッグログ: 利用可能なサービスと選択されたサービスを確認
  console.log('[App] Available services:', availableServices.map(s => ({ 
    name: s.name, 
    displayName: s.config.displayName,
    hasApiKey: !!s.config.apiKey 
  })));
  console.log('[App] Selected services:', selectedServices);

  const [currentView, setCurrentView] = useState<'upload' | 'results' | 'comparison'>('upload');

  const handleServiceToggle = (serviceName: string) => {
    toggleService(serviceName);
  };

  const handleSettingsUpdated = async () => {
    try {
      // ServiceRegistryのAPIキー設定を更新
      await serviceRegistry.updateServiceConfigs();
      console.log('Service configurations updated successfully');
    } catch (error) {
      console.error('Failed to update service configurations:', error);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile || !audioFile.isValid) return;
    if (selectedServices.length === 0) return;

    try {
      if (selectedServices.length === 1) {
        // 単一サービスの場合は従来の処理
        await transcribe(audioFile, selectedServices[0]);
      } else {
        // 複数サービスの場合は同時実行
        await transcribeWithMultipleServices(audioFile, selectedServices);
      }
      setCurrentView('results');
    } catch (error) {
      console.error('Transcription failed:', error);
    }
  };

  const handleNewUpload = () => {
    clearFile();
    setCurrentView('upload');
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* ナビゲーション */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant={currentView === 'upload' ? 'primary' : 'ghost'}
              onClick={() => setCurrentView('upload')}
            >
              アップロード
            </Button>
            <Button
              variant={currentView === 'results' ? 'primary' : 'ghost'}
              onClick={() => setCurrentView('results')}
              disabled={results.length === 0}
            >
              結果 ({results.length})
            </Button>
            <Button
              variant={currentView === 'comparison' ? 'primary' : 'ghost'}
              onClick={() => setCurrentView('comparison')}
              disabled={results.length < 2}
            >
              比較
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setIsSettingsOpen(true)}
              className="text-gray-600 hover:text-gray-700"
            >
              ⚙️
            </Button>
            
            {results.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearResults}
                className="text-red-600 hover:text-red-700"
              >
                全て削除
              </Button>
            )}
          </div>
        </div>

        {/* アップロードビュー */}
        {currentView === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                音声ファイルをアップロード
              </h2>
              
              {!audioFile ? (
                <AudioUploader
                  onFileSelect={handleFileSelect}
                  isDragOver={isDragOver}
                  onDragOver={setIsDragOver}
                  error={uploadError}
                  disabled={isUploading}
                />
              ) : (
                <div className="space-y-4">
                  <AudioPreview
                    audioFile={audioFile}
                    onRemove={clearFile}
                  />
                  <FileValidation audioFile={audioFile} />
                </div>
              )}

              {isUploading && (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner />
                  <span className="ml-2 text-sm text-gray-600">
                    ファイルを処理中...
                  </span>
                </div>
              )}
            </div>

            {audioFile && audioFile.isValid && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  文字起こし設定
                </h2>
                
                <div className="space-y-4">
                  <ServiceSelector
                    availableServices={availableServices}
                    selectedServices={selectedServices}
                    onServiceToggle={handleServiceToggle}
                    disabled={isTranscribing}
                  />

                  {transcriptionError && (
                    <ErrorMessage error={transcriptionError} />
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      {getFileInfo() && (
                        <div className="space-y-1">
                          <p>ファイル: {getFileInfo()!.name}</p>
                          <p>サイズ: {getFileInfo()!.size} • 長さ: {getFileInfo()!.duration}</p>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleTranscribe}
                      disabled={isTranscribing || !audioFile.isValid || selectedServices.length === 0}
                      className="min-w-[120px]"
                    >
                      {isTranscribing ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" className="mr-2" />
                          {selectedServices.length > 1 ? '複数サービスで処理中...' : '処理中...'}
                        </div>
                      ) : (
                        selectedServices.length > 1 ? '複数サービスで文字起こし開始' : '文字起こし開始'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 結果ビュー */}
        {currentView === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                文字起こし結果
              </h2>
              <Button onClick={handleNewUpload} variant="secondary">
                新しいファイルをアップロード
              </Button>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                まだ文字起こし結果がありません
              </div>
            ) : (
              <div className="space-y-6">
                {results.map((result) => (
                  <TranscriptionResult
                    key={result.id}
                    result={result}
                    onRemove={() => removeResult(result.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 比較ビュー */}
        {currentView === 'comparison' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                結果比較
              </h2>
              <Button onClick={handleNewUpload} variant="secondary">
                新しいファイルをアップロード
              </Button>
            </div>

            <ComparisonView results={results} />
          </div>
        )}
      </div>

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={handleSettingsUpdated}
      />
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <DIContainerContext.Provider value={container}>
      <AppContent />
    </DIContainerContext.Provider>
  );
};

export default App;