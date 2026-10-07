import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from './src/presentation/screens/LoginScreen';
import { HomeScreen } from './src/presentation/screens/HomeScreen';
import { DetailScreen } from './src/presentation/screens/DetailScreen';
import { OnboardingScreen } from './src/presentation/screens/OnboardingScreen';
import { SettingsScreen } from './src/presentation/screens/SettingsScreen';
import { RootStackParamList } from './src/navigation/types';
import { useSettingsStore, THEMES } from './src/application/store/useSettingsStore';
import { useGamificationStore } from './src/application/store/useGamificationStore';
import { User } from './src/domain/models/User';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { appConfigResult, authService, DependenciesProvider } from './src/composition';
import { ErrorBoundary } from './src/presentation/components/ErrorBoundary';
import { ConfigGate } from './src/presentation/screens/ConfigErrorScreen';
import { useAuthStore } from './src/application/store/useAuthStore';

import { InsightsScreen } from './src/presentation/screens/InsightsScreen';
import { BadgesScreen } from './src/presentation/screens/BadgesScreen';
import { GraphScreen } from './src/presentation/screens/GraphScreen';
import { ChatScreen } from './src/presentation/screens/ChatScreen';
import { RecordingsScreen } from './src/presentation/screens/RecordingsScreen';

// Trasa „Recordings” (F8-02) jest dopisana lokalnie, bo `src/navigation/types.ts` leży poza zakresem tego zadania.
type AppStackParamList = RootStackParamList & { Recordings: undefined };

const Stack = createNativeStackNavigator<AppStackParamList>();

function AppContent() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { hasHydrated, lifeGoals, theme } = useSettingsStore();

  useEffect(() => {
    // Nasłuch zmian sesji Supabase Auth rejestrowany dokładnie raz na cykl życia aplikacji.
    const unsubscribe = authService.onAuthStateChange((currentUser: User | null) => {
      setUser(currentUser);
      useAuthStore.getState().setUser(currentUser);
      if (currentUser) {
        Promise.all([
          useSettingsStore.getState().syncGoalsFromCloud(currentUser.id),
          useGamificationStore.getState().syncFromCloud(currentUser.id),
        ]).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const themeColors = THEMES[theme];

  if (initializing || !hasHydrated) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: themeColors.background,
    },
  };

  return (
    <DependenciesProvider>
      <NavigationContainer theme={appTheme}>
        <StatusBar style={themeColors.isLight ? 'dark' : 'light'} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            // Brief (docs/08-design-ui.md §0): ekran wjeżdża od dołu z fade, ~400 ms.
            animation: 'fade_from_bottom',
            animationDuration: 400,
            contentStyle: { backgroundColor: themeColors.background },
          }}
        >
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : lifeGoals.length === 0 ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Detail" component={DetailScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Insights" component={InsightsScreen} />
              <Stack.Screen name="Badges" component={BadgesScreen} />
              <Stack.Screen name="Graph" component={GraphScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="Recordings" component={RecordingsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </DependenciesProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Korzeń aplikacji: ErrorBoundary łapie wyjątki w renderze, a ConfigGate nie uruchamia reszty (logowania, klienta
 * Supabase, nawigacji), gdy konfiguracja builda jest błędna (docs/09-audyt-gotowosci.md).
 */
export default function App() {
  // SafeAreaProvider musi stać nad ConfigGate i ErrorBoundary: ekran błędu konfiguracji i fallback używają
  // ScreenContainer (useSafeAreaInsets), a bez providera biblioteka rzuca wyjątek zamiast pokazać komunikat.
  return (
    <SafeAreaProvider>
      <ErrorBoundary
        onError={(error) => console.error(`[ErrorBoundary] ${error.name}: ${error.message.slice(0, 200)}`)}
      >
        <ConfigGate result={appConfigResult}>
          <AppContent />
        </ConfigGate>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
