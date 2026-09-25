import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Crypto from 'expo-crypto';
import { useAuthService } from '../../composition';
import { Ionicons } from '@expo/vector-icons';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export const LoginScreen = () => {
  const authService = useAuthService();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onAppleButtonPress = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const rawNonce = Crypto.randomUUID();

      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: rawNonce,
      });

      const { identityToken } = appleAuthRequestResponse;

      if (!identityToken) {
        throw new Error('Nie otrzymano tokenu tożsamości z usługi Apple.');
      }

      await authService.signInWithApple(identityToken, rawNonce);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        // Użytkownik anulował logowanie
      } else {
        setErrorMessage(error?.message || 'Błąd podczas logowania przez Apple.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.data?.idToken) {
        await authService.signInWithGoogle(response.data.idToken);
      } else if (response.type === 'cancelled') {
        // Użytkownik anulował logowanie
      } else {
        throw new Error('Brak tokenu ID Google. Upewnij się, że Client ID jest poprawnie skonfigurowany.');
      }
    } catch (error: any) {
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        setErrorMessage(error?.message || 'Błąd podczas logowania przez Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>Vocaly</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Twój pamiętnik głosowy</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary || '#ffffff'} style={{ marginVertical: 20 }} />
        ) : null}

        <View style={styles.buttonContainer}>
          {Platform.OS === 'ios' ? (
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
          ) : null}

          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: theme === 'AppleDark' ? '#FFFFFF' : '#000000' }]}
            onPress={onGoogleButtonPress}
            disabled={loading}
          >
            <Ionicons
              name="logo-google"
              size={20}
              color={theme === 'AppleDark' ? '#000000' : '#FFFFFF'}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.googleButtonText, { color: theme === 'AppleDark' ? '#000000' : '#FFFFFF' }]}>
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
    marginBottom: 40,
    lineHeight: 24,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
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
  },
});
