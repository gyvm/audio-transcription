# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript audio transcription service that integrates multiple transcription APIs (currently OpenAI Whisper) to provide audio-to-text conversion with comparison capabilities. The application is built with a focus on modularity, type safety, and extensibility.

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
- **ServiceConfig Interface**: Standardized configuration for all transcription services

### State Management Pattern
Uses custom React hooks that interact with the DI container:
- **useTranscription**: Manages transcription results and processing state
- **useAudioUpload**: Handles file upload, validation, and drag-drop
- **useServiceSelector**: Manages service selection
- **useErrorHandler**: Centralized error handling

### Component Organization
- **Layout components** (`src/components/layout/`): Application shell and structure
- **Audio components** (`src/components/audio/`): File upload, preview, validation
- **Transcription components** (`src/components/transcription/`): Results display, service selection, comparison
- **Common components** (`src/components/common/`): Reusable UI elements

## Key Implementation Details

### Adding New Transcription Services
1. Create service class extending `TranscriptionService` in `src/services/transcription/[service-name]/`
2. Register in `ServiceRegistry.registerDefaultServices()` method
3. Service will automatically appear in UI via `useServiceSelector` hook

### Environment Configuration
- Uses Vite environment variables (prefixed with `VITE_`)
- Configuration centralized in `src/config/env.ts`
- API keys and settings managed through `.env` file

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
- **Service Registration**: New services must be registered in `ServiceRegistry` constructor, not just imported
- **Environment Variables**: All external API configurations must use the `VITE_` prefix for Vite bundling
- **File Validation**: Audio file validation is centralized in `useAudioUpload` hook and should be extended there for new formats