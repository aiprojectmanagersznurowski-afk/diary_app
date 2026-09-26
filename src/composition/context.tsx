import React, { createContext, useContext, useMemo } from 'react';
import { authService } from './auth';
import { profileService } from './profile';
import { audioRecorder, aiService } from './onboarding';
import {
  diaryRepository,
  recordUseCase,
  recordingQueue,
  fileStorage,
  recordingUploader,
  enqueueRecordingUseCase,
  processRecordingQueueUseCase,
} from './diary';
import { IDiaryRepository } from '../domain/repositories/IDiaryRepository';
import { IAudioRecorder } from '../domain/services/IAudioRecorder';
import { IAiService } from '../domain/services/IAiService';
import { IRecordingQueue } from '../domain/services/IRecordingQueue';
import { IFileStorage } from '../domain/services/IFileStorage';
import { IRecordingUploader } from '../domain/services/IRecordingUploader';
import { RecordAndProcessEntryUseCase } from '../application/useCases/recordAndProcess';
import { EnqueueRecordingUseCase } from '../application/useCases/recording/enqueueRecordingUseCase';
import { ProcessRecordingQueueUseCase } from '../application/useCases/recording/processRecordingQueueUseCase';

export interface AppDependencies {
  authService: typeof authService;
  profileService: typeof profileService;
  audioRecorder: IAudioRecorder;
  aiService: IAiService;
  diaryRepository: IDiaryRepository;
  recordUseCase: RecordAndProcessEntryUseCase;
  recordingQueue: IRecordingQueue;
  fileStorage: IFileStorage;
  recordingUploader: IRecordingUploader;
  enqueueRecordingUseCase: EnqueueRecordingUseCase;
  processRecordingQueueUseCase: ProcessRecordingQueueUseCase;
}

export const defaultDependencies: AppDependencies = {
  authService,
  profileService,
  audioRecorder,
  aiService,
  diaryRepository,
  recordUseCase,
  recordingQueue,
  fileStorage,
  recordingUploader,
  enqueueRecordingUseCase,
  processRecordingQueueUseCase,
};

export const DependenciesContext = createContext<AppDependencies>(defaultDependencies);

export interface DependenciesProviderProps {
  dependencies?: Partial<AppDependencies>;
  children: React.ReactNode;
}

export const DependenciesProvider: React.FC<DependenciesProviderProps> = ({ dependencies, children }) => {
  const value = useMemo(
    () => ({
      ...defaultDependencies,
      ...dependencies,
    }),
    [dependencies],
  );

  return <DependenciesContext.Provider value={value}>{children}</DependenciesContext.Provider>;
};

export const useDependencies = (): AppDependencies => {
  const context = useContext(DependenciesContext);
  return context || defaultDependencies;
};

export const useAuthService = () => useDependencies().authService;
export const useProfileService = () => useDependencies().profileService;
export const useOnboardingServices = () => {
  const { audioRecorder, aiService, profileService } = useDependencies();
  return { audioRecorder, aiService, profileService };
};
export const useDiaryServices = () => {
  const { diaryRepository, recordUseCase, audioRecorder, aiService } = useDependencies();
  return { diaryRepository, recordUseCase, audioRecorder, aiService };
};
export const useRecordingQueueServices = () => {
  const { recordingQueue, fileStorage, recordingUploader, enqueueRecordingUseCase, processRecordingQueueUseCase } =
    useDependencies();
  return {
    recordingQueue,
    fileStorage,
    recordingUploader,
    enqueueRecordingUseCase,
    processRecordingQueueUseCase,
  };
};
