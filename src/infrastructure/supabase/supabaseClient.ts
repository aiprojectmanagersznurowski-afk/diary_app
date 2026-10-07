import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigError, ConfigIssue, loadAppConfig } from '../config/appConfig';

/** Wynik walidacji konfiguracji (jedno źródło prawdy dla klienta, logowania Google i ekranu błędu). */
export const appConfigResult = loadAppConfig();

/**
 * Klient używany przy błędnej konfiguracji: każde użycie rzuca czytelny `ConfigError` zamiast wysyłać żądania
 * pod adres zastępczy. Aplikacja i tak pokazuje ekran „Błąd konfiguracji” zamiast ekranów korzystających z klienta.
 */
function createInvalidClient(issues: ConfigIssue[]): SupabaseClient {
  const error = new ConfigError(issues);
  return new Proxy({} as SupabaseClient, {
    get(_target, property) {
      // `then`/symbole sprawdzają np. await i serializację; nie powinny rzucać.
      if (property === 'then' || typeof property === 'symbol') return undefined;
      throw error;
    },
  });
}

function createConfiguredClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase: SupabaseClient = appConfigResult.config
  ? createConfiguredClient(appConfigResult.config.supabaseUrl, appConfigResult.config.supabaseAnonKey)
  : createInvalidClient(appConfigResult.issues);
