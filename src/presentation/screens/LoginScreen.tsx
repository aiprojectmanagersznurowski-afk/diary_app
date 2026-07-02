import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import authModule from '@react-native-firebase/auth';
import { auth } from '../../infrastructure/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// Ensure Google Sign-In is configured somewhere, optimally here or in App.tsx
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '742826207719-9uqp7ddlt3q4m39g6vtmtcinf4ki62ue.apps.googleusercontent.com',
  iosClientId: '742826207719-3vgqhqmjgprtsr35hoov0gluoupoe2il.apps.googleusercontent.com',
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
        const appleCredential = authModule.AppleAuthProvider.credential(identityToken);
        await auth.signInWithCredential(appleCredential);
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // handle that the user canceled the sign-in flow
      } else {
        console.error('Apple SignIn Error:', error);
      }
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      
      if (response.type === 'success') {
        const idToken = response.data?.idToken;
        if (!idToken) throw new Error('Brak tokenu ID. Upewnij się, że Web Client ID jest poprawne.');
        const googleCredential = authModule.GoogleAuthProvider.credential(idToken);
        await auth.signInWithCredential(googleCredential);
      } else {
        console.log('Google sign-in cancelled by user or other issue:', response);
      }
    } catch (error) {
      console.log('Google SignIn Error:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>Vocaly</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, marginBottom: 50 }]}>Your Voice Diary</Text>

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
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 24,
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
