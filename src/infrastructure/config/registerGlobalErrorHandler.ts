import { installGlobalErrorHandler } from './globalErrorHandler';

// Importowany jako pierwszy w index.ts, żeby błędy z etapu ładowania modułów też trafiały do loga.
installGlobalErrorHandler();
