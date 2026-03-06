/**
 * PWA Service Worker registration.
 * Install and activate are handled by the Workbox-generated SW (see vite.config.ts).
 * Skip waiting is triggered via promptUpdate() from useOfflineStatus when the user taps "Perbarui".
 */
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

export type { RegisterSWOptions };

export { useRegisterSW } from 'virtual:pwa-register/vue';
