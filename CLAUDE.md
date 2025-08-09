# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript audio transcription service that integrates multiple transcription APIs (OpenAI Whisper and AmiVoice) to provide audio-to-text conversion with comparison capabilities. The application is built with a focus on modularity, type safety, and extensibility.

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production  
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Environment setup
mise install         # Install Node.js version (optional, uses .mise.toml)
cp .env.example .env # Setup environment variables
```

## Architecture Overview

### Dependency Injection Pattern
The application uses a custom DI container system centered around:
- **DIContainer** (`src/services/di/Container.ts`): Manages service instances and configurations
- **ServiceRegistry** (`src/services/di/ServiceRegistry.ts`): Registers and bootstraps transcription services
- **DIContainerContext**: React context that provides the container to components

The DI system is initialized in `App.tsx` and provided via React context to the entire application.

### Service Layer Architecture
- **Base TranscriptionService** (`src/services/transcription/base/`): Abstract base class defining the contract
- **WhisperService** (`src/services/transcription/whisper/`): OpenAI Whisper API implementation
- **AmiVoiceService** (`src/services/transcription/amivoice/`): AmiVoice API implementation with speaker diarization
- **AmiVoiceSyncService** (`src/services/transcription/amivoice/`): Synchronous AmiVoice API for shorter audio files
- **ServiceConfig Interface**: Standardized configuration for all transcription services

### State Management Pattern
Uses custom React hooks that interact with the DI container:
- **useTranscription**: Manages transcription results and processing state
- **useMultiAPITranscription**: Handles multiple simultaneous transcription API calls for comparison
- **useAudioUpload**: Handles file upload, validation, and drag-drop
- **useServiceSelector**: Manages service selection and availability
- **useAPIKeyManager**: Secure API key storage with encryption
- **useErrorHandler**: Centralized error handling

### Component Organization
- **Layout components** (`src/components/layout/`): Application shell and structure
- **Audio components** (`src/components/audio/`): File upload, preview, validation
- **Transcription components** (`src/components/transcription/`): Results display, service selection, comparison
- **Settings components** (`src/components/settings/`): API key management, configuration
- **Common components** (`src/components/common/`): Reusable UI elements

## Key Implementation Details

### Adding New Transcription Services
1. Create service class extending `TranscriptionService` in `src/services/transcription/[service-name]/`
2. Register in `ServiceRegistry.registerServicesWithAPIKeys()` method
3. Service will automatically appear in UI via `useServiceSelector` hook

### Environment Configuration
- Uses Vite environment variables (prefixed with `VITE_`)
- Configuration centralized in `src/config/env.ts`
- API keys managed through both `.env` file and runtime user input with encryption
- Dynamic API key validation and service registration

### File Processing Flow
1. File upload → `useAudioUpload` hook validates file
2. Service selection → `useServiceSelector` manages available services
3. Transcription → `useTranscription` hook calls selected service via DI container
4. Results display → Components render results with metadata and speaker segments

### Type Safety
- Strict TypeScript configuration with type-only imports
- Comprehensive interfaces in `src/types/` for all data structures
- Generic service interfaces allowing for multiple transcription service implementations

## Critical Implementation Notes

- **Context Provider**: All hooks that use transcription services must be wrapped in `DIContainerContext.Provider`
- **Service Registration**: New services must be registered in `ServiceRegistry.registerServicesWithAPIKeys()`, not just imported
- **Environment Variables**: All external API configurations must use the `VITE_` prefix for Vite bundling
- **File Validation**: Audio file validation is centralized in `useAudioUpload` hook and should be extended there for new formats
- **API Key Management**: API keys are encrypted in localStorage via `APIKeyManager` and support both environment variables and runtime user input
- **Service Availability**: Services are dynamically registered based on API key availability and validation