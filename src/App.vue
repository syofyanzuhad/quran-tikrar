<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue';
import { useDark, useToggle } from '@vueuse/core';
import { RouterView } from 'vue-router';
import BottomNav from './components/ui/BottomNav.vue';
import OfflineBanner from './components/ui/OfflineBanner.vue';
import OnboardingOverlay from './components/ui/OnboardingOverlay.vue';
import ToastNotification from './components/ui/ToastNotification.vue';
import { useQuran } from './composables/useQuran';
import { useSettings, SETTINGS_KEY } from './composables/useSettings';

const ONBOARDING_DONE_KEY = 'onboarding-done';

const { initializeDatabase, isLoading: isSeeding, seedProgress } = useQuran();
const settings = useSettings();
const showOnboarding = ref(false);
const isOnline = ref(
    typeof navigator !== 'undefined' ? navigator.onLine : true
);

const isDark = useDark();
const toggleDark = useToggle(isDark);

provide(SETTINGS_KEY, settings);

watch(
    () => settings.arabFontSizeRem.value,
    (rem) => {
        document.documentElement.style.setProperty('--arab-font-size', rem);
    },
    { immediate: true }
);

onMounted(() => {
    try {
        showOnboarding.value = localStorage.getItem(ONBOARDING_DONE_KEY) !== 'true';
    } catch {
        showOnboarding.value = false;
    }
    isOnline.value = navigator.onLine;
    const onOnline = () => { isOnline.value = true; };
    const onOffline = () => { isOnline.value = false; };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    initializeDatabase();
});

function finishOnboarding(): void {
    showOnboarding.value = false;
}
</script>

<template>
    <div class="app">
        <OfflineBanner />
        <div v-if="isSeeding" class="seed-overlay">
            <div class="seed-progress-bar" role="progressbar" :aria-valuenow="seedProgress" aria-valuemin="0" aria-valuemax="100">
                <div class="seed-progress-fill" :style="{ width: `${seedProgress}%` }" />
            </div>
            <template v-if="!isOnline">
                <p class="seed-text seed-error">Sambungkan internet untuk mengunduh data Quran terlebih dahulu.</p>
                <p class="seed-hint">Nyalakan Wi‑Fi atau data seluler lalu muat ulang halaman.</p>
            </template>
            <template v-else>
                <p class="seed-text">Downloading Quran for offline use...</p>
                <p class="seed-progress">{{ seedProgress }}%</p>
            </template>
        </div>
        <template v-else>
            <OnboardingOverlay v-if="showOnboarding" @finish="finishOnboarding" />
            <main class="main">
                <RouterView />
            </main>
            <BottomNav />
            <ToastNotification />

            <!-- Floating Theme Toggle -->
            <button
                class="theme-toggle shadow-lg"
                @click="toggleDark()"
                :aria-label="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            >
                <!-- Sun Icon -->
                <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                <!-- Moon Icon -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            </button>
        </template>
    </div>
</template>

<style scoped>
.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}
.main {
    flex: 1;
    padding-bottom: 4rem;
}
.seed-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 0.5rem;
}
.seed-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    overflow: hidden;
}
.seed-progress-fill {
    height: 100%;
    background: var(--seed-progress-color, #0d9488);
    transition: width 0.3s ease;
}
@media (prefers-reduced-motion: reduce) {
    .seed-progress-fill {
        transition: none;
    }
}
.seed-text {
    margin: 0;
    font-size: 1rem;
}
.seed-progress {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
}
.seed-error {
    color: var(--text, #0f172a);
    font-weight: 600;
}
.seed-hint {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted, #64748b);
}

.theme-toggle {
    position: fixed;
    bottom: 5.5rem; /* Above the bottom nav */
    right: 1.25rem;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 50%;
    background: var(--surface, #ffffff);
    border: 1px solid var(--border, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 90;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.theme-toggle:active {
    transform: scale(0.92);
}
@media (prefers-reduced-motion: reduce) {
    .theme-toggle {
        transition: none;
    }
}
</style>
