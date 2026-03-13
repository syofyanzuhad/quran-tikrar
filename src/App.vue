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
import FloatingMenu from './components/common/FloatingMenu.vue';
import { useRouter } from 'vue-router';
import { useFullscreen } from '@vueuse/core';

const router = useRouter();
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

const handleToggleFullscreen = () => {
    toggleFullscreen();
};

const handlePrevPage = () => {
    const currentRoute = router.currentRoute.value;
    if (currentRoute.name === 'reader') {
        const currentPage = Number(currentRoute.params.page);
        if (currentPage > 1) {
             router.push(`/baca/${currentPage - 1}`);
        }
    }
};

const handleNextPage = () => {
    const currentRoute = router.currentRoute.value;
    if (currentRoute.name === 'reader') {
        const currentPage = Number(currentRoute.params.page);
        if (currentPage < 604) {
            router.push(`/baca/${currentPage + 1}`);
        }
    }
};

const ONBOARDING_DONE_KEY = 'onboarding-done';

const { initializeDatabase, isLoading: isSeeding, seedProgress, setupChoicePending, runQuickSetup, runFullSetup } = useQuran();
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
        <div v-if="setupChoicePending || isSeeding" class="seed-overlay">
            <div v-if="isSeeding" class="seed-progress-bar" role="progressbar" :aria-valuenow="seedProgress" aria-valuemin="0" aria-valuemax="100">
                <div class="seed-progress-fill" :style="{ width: `${seedProgress}%` }" />
            </div>
            <template v-if="!isOnline">
                <p class="seed-text seed-error">Sambungkan internet untuk mengunduh data Quran terlebih dahulu.</p>
                <p class="seed-hint">Nyalakan Wi‑Fi atau data seluler lalu muat ulang halaman.</p>
            </template>
            <template v-else-if="setupChoicePending">
                <p class="seed-title">Pilih cara unduh data Quran</p>
                <p class="seed-hint">Anda bisa mengunduh sisa data nanti di Pengaturan.</p>
                <div class="setup-choices">
                    <button type="button" class="setup-btn quick" @click="runQuickSetup">
                        <span class="setup-btn-label">Quick setup</span>
                        <span class="setup-btn-desc">Surah 1 + Juz 30 (~24 halaman), siap dipakai cepat.</span>
                    </button>
                    <button type="button" class="setup-btn full" @click="runFullSetup">
                        <span class="setup-btn-label">Full setup</span>
                        <span class="setup-btn-desc">Seluruh Quran (604 halaman), offline penuh.</span>
                    </button>
                </div>
            </template>
            <template v-else>
                <p class="seed-text">Mengunduh data Quran…</p>
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

            <!-- Floating Menu -->
            <FloatingMenu
                :is-dark="isDark"
                :is-fullscreen="isFullscreen"
                @toggle-dark="toggleDark()"
                @toggle-fullscreen="handleToggleFullscreen"
                @prev-page="handlePrevPage"
                @next-page="handleNextPage"
            />
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
.seed-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text, #0f172a);
}
.setup-choices {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.25rem;
    width: 100%;
    max-width: 20rem;
}
.setup-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    padding: 1rem 1.25rem;
    border-radius: 1rem;
    border: 2px solid var(--border, #e2e8f0);
    background: var(--surface, #fff);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
}
.setup-btn:hover {
    border-color: #1a7a4a;
    background: #f0fdf4;
}
.setup-btn:active {
    transform: scale(0.98);
}
.setup-btn.quick {
    border-color: #0d9488;
    background: var(--bg-green-50, #153A2D);
}
.setup-btn.quick:hover {
    border-color: #0f766e;
    background: var(--bg-green-100, #2C6E55);
}
.setup-btn.full {
    border-color: #1a7a4a;
    background: var(--bg-green-50, #153A2D);
}
.setup-btn.full:hover {
    border-color: #15803d;
    background: var(--bg-green-100, #2C6E55);
}
.setup-btn-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text, #0f172a);
}
.setup-btn-desc {
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-muted, #64748b);
}
@media (prefers-reduced-motion: reduce) {
    .setup-btn {
        transition: none;
    }
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
