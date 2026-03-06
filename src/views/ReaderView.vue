<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSwipe } from '@vueuse/core';
import { useQuran } from '../composables/useQuran';
import { useTikrar } from '../composables/useTikrar';
import { SETTINGS_KEY } from '../composables/useSettings';
import type { SettingsState } from '../composables/useSettings';
import BlockReader from '../components/quran/BlockReader.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import { LAST_PAGE_KEY } from '../constants/storage';

const settings = inject<SettingsState | null>(SETTINGS_KEY);

const TOTAL_PAGES = 604;

const route = useRoute();
const router = useRouter();
const { getPageData } = useQuran();
const tikrar = useTikrar();

const pageNumber = computed(() => {
    const p = route.params.page;
    const n = typeof p === 'string' ? parseInt(p, 10) : Array.isArray(p) ? parseInt(p[0] ?? '', 10) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= TOTAL_PAGES ? n : 1;
});

const ayahs = ref<import('../types/quran').Ayah[]>([]);
const blocks = ref<import('../types/quran').TikrarBlock[]>([]);
const loading = ref(true);

const canPrev = computed(() => pageNumber.value > 1);
const canNext = computed(() => pageNumber.value < TOTAL_PAGES);

function saveLastPage(page: number): void {
    try {
        localStorage.setItem(LAST_PAGE_KEY, String(page));
    } catch {
        /* ignore */
    }
}

function goToPage(p: number): void {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, p));
    if (clamped === pageNumber.value) return;
    router.replace({ name: 'reader', params: { page: String(clamped) } });
}

function setActiveBlock(index: number): void {
    tikrar.currentBlockIndex.value = index;
}

async function loadPage(p: number): Promise<void> {
    loading.value = true;
    try {
        if (settings) {
            tikrar.targetReps.value = settings.targetReps.value;
            tikrar.mode.value = settings.tikrarMode.value;
        }
        const data = await getPageData(p);
        ayahs.value = data.ayahs;
        blocks.value = data.blocks;
        tikrar.startSession(p);
    } finally {
        loading.value = false;
    }
}

watch(pageNumber, (p) => {
    saveLastPage(p);
    void loadPage(p);
}, { immediate: true });

onMounted(() => {
    saveLastPage(pageNumber.value);
});

const readerEl = ref<HTMLElement | null>(null);
useSwipe(readerEl, {
    onSwipeEnd(_, direction) {
        if (direction === 'left') goToPage(pageNumber.value + 1);
        else if (direction === 'right') goToPage(pageNumber.value - 1);
    },
    threshold: 50,
});
</script>

<template>
    <div ref="readerEl" class="reader-view">
        <!-- Page navigation -->
        <nav class="page-nav">
            <button
                type="button"
                class="nav-btn"
                :disabled="!canPrev"
                aria-label="Halaman sebelumnya"
                @click="goToPage(pageNumber - 1)"
            >
                ← sebelumnya
            </button>
            <button
                type="button"
                class="nav-btn"
                :disabled="!canNext"
                aria-label="Halaman berikutnya"
                @click="goToPage(pageNumber + 1)"
            >
                berikutnya →
            </button>
        </nav>

        <LoadingSpinner
            v-if="loading && ayahs.length === 0"
            size="lg"
            class="center-spinner"
        />
        <BlockReader
            v-else-if="ayahs.length > 0"
            :page-number="pageNumber"
            :blocks="blocks"
            :ayahs="ayahs"
            :active-block-index="tikrar.currentBlockIndex.value"
            :session-reps="tikrar.sessionReps.value"
            :target-reps="settings ? settings.targetReps.value : tikrar.targetReps.value"
            :show-translation="settings?.showTranslation.value !== false"
            :show-page-number="settings?.showPageNumber.value !== false"
            :is-combined-available="tikrar.isCombinedAvailable.value"
            :combined-id="tikrar.combinedId.value"
            @block-tapped="setActiveBlock"
            @rep-incremented="tikrar.incrementRep"
            @block-completed="tikrar.nextBlock"
            @combined-completed="goToPage(pageNumber + 1)"
        />
        <div v-else class="empty-state">
            <p class="empty">Halaman ini belum diunduh.</p>
            <p class="empty-hint">Buka <router-link to="/pengaturan">Pengaturan</router-link> untuk mengunduh data Quran (sisa halaman).</p>
        </div>
    </div>
</template>

<style scoped>
.reader-view {
    padding: 0.5rem;
    padding-bottom: 5rem;
    touch-action: pan-y;
}
@media (min-width: 640px) {
    .reader-view {
        padding: 1rem;
        padding-bottom: 5rem;
    }
}
.page-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem 0;
}
.nav-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: white;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1a7a4a;
    cursor: pointer;
    transition: background 0.2s, opacity 0.2s;
}
.nav-btn:hover:not(:disabled) {
    background: #f0fdf4;
}
.nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.center-spinner {
    display: flex;
    justify-content: center;
    padding: 3rem;
}
.empty-state {
    padding: 2rem;
    text-align: center;
}
.empty {
    color: #64748b;
    margin: 0 0 0.5rem 0;
}
.empty-hint {
    margin: 0;
    font-size: 0.875rem;
    color: #64748b;
}
.empty-hint a {
    color: #1a7a4a;
    font-weight: 500;
    text-decoration: underline;
}
</style>
