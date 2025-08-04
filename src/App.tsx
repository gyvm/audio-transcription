import React, { useState } from 'react';
import { MainLayout } from './components/layout';
import { AudioUploader, AudioPreview, FileValidation } from './components/audio';
import { ServiceSelector, TranscriptionResult, ComparisonView } from './components/transcription';
import { Button, LoadingSpinner, ErrorMessage } from './components/common';
import { useAudioUpload, useTranscription, useServiceSelector, DIContainerContext } from './hooks';
import { ServiceRegistry } from './services/di/ServiceRegistry';

const serviceRegistry = new ServiceRegistry();
const container = serviceRegistry.getContainer();

const AppContent: React.FC = () => {
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
    selectedService,
    setSelectedService,
    transcribe,
    clearResults,
    removeResult,
  } = useTranscription();

  const availableServices = container.getAvailableServices();
  const { selectService } = useServiceSelector(availableServices);

  const [currentView, setCurrentView] = useState<'upload' | 'results' | 'comparison'>('upload');

  const handleServiceChange = (serviceName: string) => {
    setSelectedService(serviceName);
    selectService(serviceName);
  };

  const handleTranscribe = async () => {
    if (!audioFile || !audioFile.isValid) return;

    try {
      await transcribe(audioFile);
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
                    selectedService={selectedService}
                    onServiceSelect={handleServiceChange}
                    disabled={isTranscribing}
                  />

                  {transcriptionError && (
                    <ErrorMessage message={transcriptionError} />
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
                      disabled={isTranscribing || !audioFile.isValid}
                      className="min-w-[120px]"
                    >
                      {isTranscribing ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" className="mr-2" />
                          処理中...
                        </div>
                      ) : (
                        '文字起こし開始'
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