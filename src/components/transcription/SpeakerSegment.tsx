import React from 'react';
import type { Speaker } from '../../types/transcription';
import { AudioUtils } from '../../services/audio';

interface SpeakerSegmentProps {
  speaker: Speaker;
  className?: string;
}

export const SpeakerSegment: React.FC<SpeakerSegmentProps> = ({
  speaker,
  className = '',
}) => {
  const getSegmentDuration = (startTime: number, endTime: number): string => {
    return AudioUtils.formatTime(endTime - startTime);
  };

  const getTotalSpeakingTime = (): string => {
    const totalSeconds = speaker.segments.reduce(
      (total, segment) => total + (segment.endTime - segment.startTime),
      0
    );
    return AudioUtils.formatTime(totalSeconds);
  };

  const getAverageConfidence = (): number => {
    const confidenceValues = speaker.segments
      .map(segment => segment.confidence)
      .filter((confidence): confidence is number => confidence !== undefined);
    
    if (confidenceValues.length === 0) return 0;
    
    return confidenceValues.reduce((sum, confidence) => sum + confidence, 0) / confidenceValues.length;
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-800">
              {speaker.id}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {speaker.name || `話者 ${speaker.id}`}
            </h4>
            <p className="text-xs text-gray-500">
              {speaker.segments.length} セグメント • 合計 {getTotalSpeakingTime()}
            </p>
          </div>
        </div>
        
        {getAverageConfidence() > 0 && (
          <div className="text-xs text-gray-500">
            信頼度: {(getAverageConfidence() * 100).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="space-y-3">
        {speaker.segments.map((segment, index) => (
          <div key={index} className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{AudioUtils.formatTime(segment.startTime)}</span>
                <span>→</span>
                <span>{AudioUtils.formatTime(segment.endTime)}</span>
                <span className="text-gray-400">
                  ({getSegmentDuration(segment.startTime, segment.endTime)})
                </span>
              </div>
              
              {segment.confidence && (
                <div className="text-xs text-gray-500">
                  {(segment.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-900 leading-relaxed">
              {segment.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};