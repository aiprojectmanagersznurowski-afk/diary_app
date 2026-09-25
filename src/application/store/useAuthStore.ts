import { create } from 'zustand';
import { User } from '../../domain/models/User';

interface AuthState {
  user: User | null;
  initializing: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setInitializing: (initializing: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  setInitializing: (initializing) => set({ initializing }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
