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
import { auth } from './src/infrastructure/firebase/firebaseConfig';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { InsightsScreen } from './src/presentation/screens/InsightsScreen';
import { BadgesScreen } from './src/presentation/screens/BadgesScreen';
import { useGamificationStore } from './src/application/store/useGamificationStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const { hasHydrated, lifeGoals, theme, syncGoalsFromCloud } = useSettingsStore();
  const { syncFromCloud: syncGamificationFromCloud } = useGamificationStore();

  useEffect(() => {
    const subscriber = auth.onAuthStateChanged((currentUser: FirebaseAuthTypes.User | null) => {
      setUser(currentUser);
      if (currentUser) {
        Promise.all([syncGoalsFromCloud(), syncGamificationFromCloud()]).finally(() => {
          if (initializing) setInitializing(false);
        });
      } else {
        if (initializing) setInitializing(false);
      }
    });
    return subscriber; // unsubscribe on unmount
  }, [initializing]);

  if (initializing || !hasHydrated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const themeColors = THEMES[theme];

  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: themeColors.background,
    },
  };

  return (
    <NavigationContainer theme={appTheme}>
      <StatusBar style="light" />
      <Stack.Navigator 
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
