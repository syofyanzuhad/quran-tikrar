<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue';
import { RouterView } from 'vue-router';
import BottomNav from './components/ui/BottomNav.vue';
import OfflineBanner from './components/ui/OfflineBanner.vue';
import OnboardingOverlay from './components/ui/OnboardingOverlay.vue';
import { useQuran } from './composables/useQuran';
import { useSettings, SETTINGS_KEY } from './composables/useSettings';

const ONBOARDING_DONE_KEY = 'onboarding-done';

const { initializeDatabase, isLoading: isSeeding, seedProgress } = useQuran();
const settings = useSettings();
const showOnboarding = ref(false);
const isOnline = ref(
    typeof navigator !== 'undefined' ? navigator.onLine : true
);

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
</style>
