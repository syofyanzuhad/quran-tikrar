import { ref, onMounted, onUnmounted } from 'vue';
import { useRegisterSW } from '../registerServiceWorker';
import type { Ref } from 'vue';

export interface UseOfflineStatusReturn {
    isOnline: Ref<boolean>;
    isUpdateAvailable: Ref<boolean>;
    offlineSince: Ref<Date | null>;
    promptUpdate: () => Promise<void>;
}

/**
 * Composable for offline status and PWA update prompt.
 * Uses navigator.onLine and service worker needRefresh.
 */
export function useOfflineStatus(): UseOfflineStatusReturn {
    const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const offlineSince = ref<Date | null>(null);

    const { needRefresh, updateServiceWorker } = useRegisterSW({
        onRegistered(registration) {
            if (registration) {
                registration.addEventListener('updatefound', () => {
                    // New content will be available after skipWaiting + reload
                });
            }
        },
        onRegisterError(error) {
            console.error('SW registration error:', error);
        },
    });

    const isUpdateAvailable = needRefresh;

    async function promptUpdate(): Promise<void> {
        await updateServiceWorker(true);
    }

    function setOnline(): void {
        isOnline.value = true;
        offlineSince.value = null;
    }

    function setOffline(): void {
        isOnline.value = false;
        if (!offlineSince.value) offlineSince.value = new Date();
    }

    onMounted(() => {
        isOnline.value = navigator.onLine;
        window.addEventListener('online', setOnline);
        window.addEventListener('offline', setOffline);
    });

    onUnmounted(() => {
        window.removeEventListener('online', setOnline);
        window.removeEventListener('offline', setOffline);
    });

    return {
        isOnline,
        isUpdateAvailable,
        offlineSince,
        promptUpdate,
    };
}
