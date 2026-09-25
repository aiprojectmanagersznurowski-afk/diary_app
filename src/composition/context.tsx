import React, { createContext, useContext, useMemo } from 'react';
import { authService } from './auth';
import { profileService } from './profile';
import { audioRecorder, aiService } from './onboarding';
import { diaryRepository, recordUseCase } from './diary';
import { IDiaryRepository } from '../domain/repositories/IDiaryRepository';
import { IAudioRecorder } from '../domain/services/IAudioRecorder';
import { IAiService } from '../domain/services/IAiService';
import { RecordAndProcessEntryUseCase } from '../application/useCases/recordAndProcess';

export interface AppDependencies {
  authService: typeof authService;
  profileService: typeof profileService;
  audioRecorder: IAudioRecorder;
  aiService: IAiService;
  diaryRepository: IDiaryRepository;
  recordUseCase: RecordAndProcessEntryUseCase;
}

export const defaultDependencies: AppDependencies = {
  authService,
  profileService,
  audioRecorder,
  aiService,
  diaryRepository,
  recordUseCase,
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
