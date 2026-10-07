import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { appConfigResult, useAuthService } from '../../composition';
import { ScreenContainer, GradientText, useTheme, ACCENTS, WHITE_BUTTON, SHADOW } from '../components/ui';
import { pl } from '../i18n/pl';

let googleConfigured = false;

/** Konfiguruje natywny SDK Google dopiero przy poprawnych identyfikatorach (nie na poziomie modułu). */
function ensureGoogleConfigured(): boolean {
  if (googleConfigured) return true;
  const config = appConfigResult.config;
  if (!config) return false;
  GoogleSignin.configure({ webClientId: config.googleWebClientId, iosClientId: config.googleIosClientId });
  googleConfigured = true;
  return true;
}

export const LoginScreen = () => {
  const authService = useAuthService();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onAppleButtonPress = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { identityToken } = appleAuthRequestResponse;

      if (!identityToken) {
        throw new Error(pl.login.appleNoToken);
      }

      await authService.signInWithApple(identityToken, rawNonce);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        // Użytkownik anulował logowanie
      } else {
        setErrorMessage(error?.message || pl.login.appleError);
      }
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!ensureGoogleConfigured()) throw new Error(pl.login.googleError);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.data?.idToken) {
        await authService.signInWithGoogle(response.data.idToken);
      } else if (response.type === 'cancelled') {
        // Użytkownik anulował logowanie
      } else {
        throw new Error(pl.login.googleNoToken);
      }
    } catch (error: any) {
      if (error?.code !== 'SIGN_IN_CANCELLED') {
        setErrorMessage(error?.message || pl.login.googleError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer paddingHorizontal={28} style={styles.screen}>
      <View style={styles.middle}>
        <View style={[styles.iconWrap, { shadowColor: colors.primary }]}>
          <Image source={require('../../../assets/icon.png')} style={styles.icon} />
        </View>
        <GradientText text={pl.login.title} style={styles.title} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{pl.login.subtitle}</Text>
      </View>

      <View style={styles.bottom}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {loading ? (
          <View style={styles.loggingIn}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loggingInText, { color: colors.textSecondary }]}>{pl.login.loggingIn}</Text>
          </View>
        ) : (
          <>
            {Platform.OS === 'ios' ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  colors.isLight
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                }
                cornerRadius={16}
                style={styles.appleButton}
                onPress={onAppleButtonPress}
              />
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
              onPress={onGoogleButtonPress}
              accessibilityRole="button"
            >
              <Ionicons name="logo-google" size={20} color={WHITE_BUTTON.text} style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>{pl.login.google}</Text>
            </Pressable>
          </>
        )}

        <Text style={[styles.legal, { color: colors.textSecondary }]}>{pl.login.legal}</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 28,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 25,
    elevation: 12,
  },
  icon: { width: 112, height: 112, borderRadius: 28 },
  title: { fontSize: 44, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 17, fontWeight: '500', textAlign: 'center' },
  bottom: { gap: 12 },
  errorText: { color: ACCENTS.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 10 },
  loggingIn: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loggingInText: { fontSize: 13 },
  legal: { fontSize: 12, textAlign: 'center', marginTop: 8, marginHorizontal: 10, lineHeight: 17 },
  appleButton: { width: '100%', height: 54 },
  googleButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE_BUTTON.background,
    borderWidth: 1,
    borderColor: WHITE_BUTTON.border,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  googleIcon: { marginRight: 10 },
  googleButtonText: { fontSize: 17, fontWeight: '600', color: WHITE_BUTTON.text },
  pressed: { transform: [{ scale: 0.985 }] },
});
