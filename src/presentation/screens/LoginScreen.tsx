import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import authModule from '@react-native-firebase/auth';
import { auth } from '../../infrastructure/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// Ensure Google Sign-In is configured somewhere, optimally here or in App.tsx
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
});

export const LoginScreen = () => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  const onAppleButtonPress = async () => {
    try {
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleAuthRequestResponse;

      if (identityToken) {
        // Create a Firebase credential from the response
        const appleCredential = authModule.AppleAuthProvider.credential(identityToken);

        // Sign the user in with the credential
        await auth.signInWithCredential(appleCredential);
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // handle that the user canceled the sign-in flow
      } else {
        console.error(error);
      }
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the users ID token
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) throw new Error('No ID token found');

      // Create a Google credential with the token
      const googleCredential = authModule.GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      await auth.signInWithCredential(googleCredential);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Ionicons name="book" size={80} color={colors.primary} style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>Mój Inteligentny Pamiętnik</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Zaloguj się, aby synchronizować swoje wpisy i cele w chmurze.
        </Text>

        <View style={styles.buttonContainer}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              theme === 'AppleDark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={16}
            style={styles.appleButton}
            onPress={onAppleButtonPress}
          />

          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: theme === 'AppleDark' ? '#FFFFFF' : '#000000' }
            ]}
            onPress={onGoogleButtonPress}
          >
            <Ionicons 
              name="logo-google" 
              size={20} 
              color={theme === 'AppleDark' ? '#000000' : '#FFFFFF'} 
              style={{ marginRight: 10 }}
            />
            <Text style={[
              styles.googleButtonText,
              { color: theme === 'AppleDark' ? '#000000' : '#FFFFFF' }
            ]}>
              Zaloguj z Google
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  appleButton: {
    width: '100%',
    height: 54,
  },
  googleButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 19,
    fontWeight: '500',
  }
});
