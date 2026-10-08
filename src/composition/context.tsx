import React, { createContext, useContext, useMemo } from 'react';
import { authService } from './auth';
import { profileService } from './profile';
import { audioRecorder, aiService } from './onboarding';
import { userContextRepository } from './userContext';
import {
  diaryRepository,
  recordUseCase,
  recordingQueue,
  fileStorage,
  recordingUploader,
  enqueueRecordingUseCase,
  processRecordingQueueUseCase,
  recordingRepository,
  noteRepository,
  retryRecordingUseCase,
  getNotesUseCase,
} from './diary';
import { IDiaryRepository } from '../domain/repositories/IDiaryRepository';
import { IAudioRecorder } from '../domain/services/IAudioRecorder';
import { IAiService } from '../domain/services/IAiService';
import { IUserContextRepository } from '../domain/repositories/IUserContextRepository';
import { IRecordingQueue } from '../domain/services/IRecordingQueue';
import { IFileStorage } from '../domain/services/IFileStorage';
import { IRecordingUploader } from '../domain/services/IRecordingUploader';
import { IRecordingRepository } from '../domain/repositories/IRecordingRepository';
import { INoteRepository } from '../domain/repositories/INoteRepository';
import { RecordAndProcessEntryUseCase } from '../application/useCases/recordAndProcess';
import { EnqueueRecordingUseCase } from '../application/useCases/recording/enqueueRecordingUseCase';
import { ProcessRecordingQueueUseCase } from '../application/useCases/recording/processRecordingQueueUseCase';
import { RetryRecordingUseCase } from '../application/useCases/recording/retryRecordingUseCase';
import { GetNotesUseCase } from '../application/useCases/notes/getNotesUseCase';

export interface AppDependencies {
  authService: typeof authService;
  profileService: typeof profileService;
  audioRecorder: IAudioRecorder;
  aiService: IAiService;
  userContextRepository: IUserContextRepository;
  diaryRepository: IDiaryRepository;
  recordUseCase: RecordAndProcessEntryUseCase;
  recordingQueue: IRecordingQueue;
  fileStorage: IFileStorage;
  recordingUploader: IRecordingUploader;
  enqueueRecordingUseCase: EnqueueRecordingUseCase;
  processRecordingQueueUseCase: ProcessRecordingQueueUseCase;
  recordingRepository: IRecordingRepository;
  noteRepository: INoteRepository;
  retryRecordingUseCase: RetryRecordingUseCase;
  getNotesUseCase: GetNotesUseCase;
}

export const defaultDependencies: AppDependencies = {
  authService,
  profileService,
  audioRecorder,
  aiService,
  userContextRepository,
  diaryRepository,
  recordUseCase,
  recordingQueue,
  fileStorage,
  recordingUploader,
  enqueueRecordingUseCase,
  processRecordingQueueUseCase,
  recordingRepository,
  noteRepository,
  retryRecordingUseCase,
  getNotesUseCase,
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
  const { audioRecorder, aiService, profileService, userContextRepository } = useDependencies();
  return { audioRecorder, aiService, profileService, userContextRepository };
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

export const useNotesServices = () => {
  const { recordingRepository, noteRepository, retryRecordingUseCase, getNotesUseCase } = useDependencies();
  return {
    recordingRepository,
    noteRepository,
    retryRecordingUseCase,
    getNotesUseCase,
  };
};
