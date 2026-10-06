import { useGamificationStore, setGamificationProfileRepository } from '../useGamificationStore';
import { useAuthStore } from '../useAuthStore';
import { IProfileRepository } from '../../../domain/repositories/IProfileRepository';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

const baseState = {
  currentStreak: 0,
  lastEntryDate: null,
  unlockedBadges: [] as string[],
  newlyUnlockedBadge: null,
  pendingBadges: [],
};

describe('useGamificationStore.evaluateBadges', () => {
  let upsertProfile: jest.Mock;

  beforeEach(() => {
    upsertProfile = jest.fn().mockResolvedValue(undefined);
    setGamificationProfileRepository({ upsertProfile } as unknown as IProfileRepository);
    useAuthStore.getState().setUser({ id: 'user-1', email: null, name: null, avatarUrl: null });
    useGamificationStore.setState({ ...baseState });
  });

  afterEach(() => {
    setGamificationProfileRepository(null);
  });

  it('nic nie robi bez wpisów i bez serii', () => {
    useGamificationStore.getState().evaluateBadges(0, false);
    expect(useGamificationStore.getState().newlyUnlockedBadge).toBeNull();
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it('pierwszy wpis przyznaje „Pierwszy Krok” i zapisuje odznaki w profilu', () => {
    useGamificationStore.getState().evaluateBadges(1, true);
    const state = useGamificationStore.getState();
    expect(state.unlockedBadges).toEqual(['first_step']);
    expect(state.newlyUnlockedBadge?.title).toBe('Pierwszy Krok');
    expect(upsertProfile).toHaveBeenCalledWith({ userId: 'user-1', badges: ['first_step'] });
  });

  it('kolejkuje kilka odznak naraz i pokazuje je po kolei po zamknięciu modala', () => {
    useGamificationStore.getState().evaluateBadges(7, true);
    let state = useGamificationStore.getState();
    expect(state.unlockedBadges).toEqual(['first_step', 'streak_3', 'streak_7']);
    expect(state.newlyUnlockedBadge?.id).toBe('first_step');
    expect(state.pendingBadges.map((b) => b.id)).toEqual(['streak_3', 'streak_7']);

    useGamificationStore.getState().dismissBadgeAlert();
    state = useGamificationStore.getState();
    expect(state.newlyUnlockedBadge?.id).toBe('streak_3');
    expect(state.pendingBadges.map((b) => b.id)).toEqual(['streak_7']);

    useGamificationStore.getState().dismissBadgeAlert();
    useGamificationStore.getState().dismissBadgeAlert();
    expect(useGamificationStore.getState().newlyUnlockedBadge).toBeNull();
    expect(useGamificationStore.getState().pendingBadges).toEqual([]);
  });

  it('nie przyznaje drugi raz odznak, które użytkownik już ma', () => {
    useGamificationStore.setState({ ...baseState, unlockedBadges: ['first_step', 'streak_3'] });
    useGamificationStore.getState().evaluateBadges(3, true);
    expect(useGamificationStore.getState().newlyUnlockedBadge).toBeNull();
    expect(upsertProfile).not.toHaveBeenCalled();

    useGamificationStore.getState().evaluateBadges(8, true);
    expect(useGamificationStore.getState().newlyUnlockedBadge?.id).toBe('streak_7');
  });

  it('nowa odznaka dołącza do kolejki, gdy modal jest już otwarty', () => {
    useGamificationStore.getState().evaluateBadges(1, true);
    useGamificationStore.getState().evaluateBadges(3, true);
    const state = useGamificationStore.getState();
    expect(state.newlyUnlockedBadge?.id).toBe('first_step');
    expect(state.pendingBadges.map((b) => b.id)).toEqual(['streak_3']);
  });
});
