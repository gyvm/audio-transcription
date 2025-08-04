export class AudioUtils {
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  static parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  static isAudioFile(file: File): boolean {
    const audioMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/flac',
      'audio/x-flac',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
    ];

    const audioExtensions = [
      'mp3', 'wav', 'flac', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'webm'
    ];

    if (audioMimeTypes.includes(file.type.toLowerCase())) {
      return true;
    }

    const extension = file.name.toLowerCase().split('.').pop();
    return extension ? audioExtensions.includes(extension) : false;
  }

  static validateAudioDuration(duration: number, maxDurationSeconds: number): boolean {
    return duration <= maxDurationSeconds;
  }

  static createAudioPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  static revokeAudioPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}