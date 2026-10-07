import { appConfigResult } from '../infrastructure/supabase/supabaseClient';

export { ConfigError } from '../infrastructure/config/appConfig';
export type { AppConfig, ConfigIssue, ConfigResult } from '../infrastructure/config/appConfig';

/** Wynik walidacji konfiguracji aplikacji (docs/09-audyt-gotowosci.md): używany przez App i ekran logowania. */
export { appConfigResult };
