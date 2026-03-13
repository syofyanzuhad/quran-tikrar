<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSwipe, useFullscreen } from '@vueuse/core';
import AppReader from '../components/reader/AppReader.vue';
import MushafReader from '../components/reader/MushafReader.vue';
import CombinedSessionCard from '../components/reader/CombinedSessionCard.vue';
import type { ReaderUIMode, TikrarBlockUI } from '../types/reader';
import { getBlockColor } from '../constants/blockColors';

import { useQuran } from '../composables/useQuran';
import { useTikrar } from '../composables/useTikrar';
import { SETTINGS_KEY } from '../composables/useSettings';
import type { SettingsState } from '../composables/useSettings';
import { LAST_PAGE_KEY } from '../constants/storage';
import { useToast } from '../composables/useToast';

const TOTAL_PAGES = 604;
const route = useRoute();
const router = useRouter();

const settings = inject<SettingsState | null>(SETTINGS_KEY);
const { getPageData } = useQuran();
const tikrar = useTikrar();

let showToast = (msg: string, _opts?: any) => alert(msg);
try {
  const toastCtx = useToast();
  if (toastCtx && 'addToast' in toastCtx) {
    showToast = (msg: string, _opts?: any) => toastCtx.addToast(msg);
  }
} catch {
  // Ignore missing useToast
}

const uiMode = ref<ReaderUIMode>('mushaf');

onMounted(() => {
  const saved = localStorage.getItem('tikrar-reader-ui-mode') as ReaderUIMode | null;
  if (saved === 'app' || saved === 'mushaf') {
    uiMode.value = saved;
  }
});

watch(uiMode, (newMode) => {
  localStorage.setItem('tikrar-reader-ui-mode', newMode);
});

const pageNumber = computed(() => {
  const p = route.params.page;
  const n = typeof p === 'string' ? parseInt(p, 10) : Array.isArray(p) ? parseInt(p[0] ?? '', 10) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= TOTAL_PAGES ? n : 1;
});

const ayahs = ref<import('../types/quran').Ayah[]>([]);
const blocks = ref<import('../types/quran').TikrarBlock[]>([]);
const loading = ref(true);
const surahNameArabic = ref('سورة');

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

    if (data.ayahs.length > 0) {
      const db = await import('../db').then(m => m.db);
      const firstAyah = data.ayahs[0];
      if (firstAyah && firstAyah.surahId) {
        const surah = await db.surahs.get(firstAyah.surahId);
        if (surah) {
          surahNameArabic.value = `سُورَةُ ${surah.nameArabic}`;
        }
      }
    }

    tikrar.startSession(p);
  } finally {
    loading.value = false;
  }
}

watch(pageNumber, (p) => {
  saveLastPage(p);
  void loadPage(p);
}, { immediate: true });

const mappedBlocks = computed<TikrarBlockUI[]>(() => {
  return blocks.value.map((b, i) => ({
    index: i,
    colorKey: i === 0 ? 'yellow' : i === 1 ? 'green' : i === 2 ? 'blue' : 'orange',
    color: getBlockColor(i, settings ? settings.blockColorMode.value : 'default', settings?.darkMode.value) as any,
    labelArabic: ['١', '٢', '٣', '٤'][i] || '',
    labelLatin: `Blok ${i + 1}`,
    ayahIds: b.ayahIds,
  }));
});

const mappedAyahs = computed<Record<number, any>>(() => {
  const map: Record<number, any> = {};
  ayahs.value.forEach(a => {
    map[a.id] = {
      ...a,
      arabic: a.textArab,
      translation: a.textIndoTranslation
    };
  });
  return map;
});

const mappedReps = computed<number[]>(() => {
  return [0, 1, 2, 3].map(i => {
    const id = `page-${pageNumber.value}-block-${i}`;
    return tikrar.sessionReps.value[id] || 0;
  });
});

const combinedAvailable = computed(() => tikrar.isCombinedAvailable.value);
const combinedReps = computed(() => tikrar.sessionReps.value[tikrar.combinedId.value] ?? 0);
const combinedTarget = computed(() => settings ? settings.targetReps.value : tikrar.targetReps.value);
const combinedAyahIds = computed(() => ayahs.value.map(a => a.id));
const mushafFontScale = computed(() => {
  const size = settings?.arabFontSize.value ?? 'medium';
  if (size === 'small') return 0.9;
  if (size === 'large') return 1.12;
  if (size === 'xlarge') return 1.25;
  return 1;
});

const readerHandlers = {
  addRep: (index: number) => tikrar.incrementRep(`page-${pageNumber.value}-block-${index}`),
  resetBlock: (index: number) => tikrar.resetBlock(`page-${pageNumber.value}-block-${index}`),
  setActiveBlock: (index: number) => { tikrar.currentBlockIndex.value = index; }
};

const handleCombinedAdd = () => tikrar.incrementRep(tikrar.combinedId.value);
const handleCombinedReset = () => tikrar.resetBlock(tikrar.combinedId.value);

onMounted(() => {
  tikrar.emitter.on('block-complete', (e) => {
    if (!e.isPageComplete) {
      const bg = uiMode.value === 'app' ? '#111827' : '#1A1209';
      const color = uiMode.value === 'app' ? '#FFFFFF' : '#F5DEB3';
      const currentIdx = e.blockIndex ?? 0;
      showToast(`Blok ${currentIdx + 1} selesai! Lanjut Blok ${currentIdx + 2}`, { style: { background: bg, color } });
    }
  });

  tikrar.emitter.on('page-complete', () => {
    const bg = uiMode.value === 'app' ? '#111827' : '#1A1209';
    const color = uiMode.value === 'app' ? '#FFFFFF' : '#F5DEB3';
    showToast('🌟 Masya Allah! Semua blok selesai!', { style: { background: bg, color } });
  });
});

const readerEl = ref<HTMLElement | null>(null);
useSwipe(readerEl, {
  onSwipeEnd(_e, direction) {
    if (direction === 'left') goToPage(pageNumber.value - 1);
    else if (direction === 'right') goToPage(pageNumber.value + 1);
  },
  threshold: 50,
});

const { isFullscreen } = useFullscreen(readerEl);
</script>

<template>
  <div
    ref="readerEl"
    class="reader-view"
    :class="[
      uiMode === 'app' ? 'reader-view--app' : 'reader-view--mushaf',
      isFullscreen ? 'reader-view--fullscreen' : ''
    ]"
    :style="!isFullscreen ? { paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' } : {}"
  >
    <div class="reader-topbar" :class="uiMode === 'app' ? 'reader-topbar--app' : 'reader-topbar--mushaf'">
      <div class="reader-toggle" :class="uiMode === 'app' ? 'reader-toggle--app' : 'reader-toggle--mushaf'">
        <button
          type="button"
          class="reader-toggle__btn"
          :class="uiMode === 'app' ? 'is-active' : ''"
          @click="uiMode = 'app'"
        >
          <span class="reader-toggle__icon">📱</span>
          Mode Aplikasi
        </button>
        <button
          type="button"
          class="reader-toggle__btn"
          :class="uiMode === 'mushaf' ? 'is-active' : ''"
          @click="uiMode = 'mushaf'"
        >
          <span class="reader-toggle__icon">📜</span>
          Mode Mushaf
        </button>
      </div>
    </div>

    <div class="reader-body custom-scrollbar">
      <div v-if="loading && ayahs.length === 0" class="reader-loading">
        <div class="reader-spinner"></div>
      </div>

      <div v-else-if="ayahs.length === 0" class="reader-empty">
        <p>Halaman ini belum diunduh.</p>
        <router-link to="/pengaturan" class="reader-empty__link">Buka Pengaturan</router-link>
      </div>

      <template v-else>
        <AppReader
          v-if="uiMode === 'app'"
          :blocks="mappedBlocks"
          :ayahs-map="mappedAyahs"
          :reps="mappedReps"
          :active-block-index="tikrar.currentBlockIndex.value"
          :target-reps="settings ? settings.targetReps.value : tikrar.targetReps.value"
          :show-translation="settings?.showTranslation.value !== false"
          :page-number="pageNumber"
          :surah-name-arabic="surahNameArabic"
          :combined-available="combinedAvailable"
          :combined-reps="combinedReps"
          :combined-target="combinedTarget"
          :combined-ayah-ids="combinedAyahIds"
          @add-rep="readerHandlers.addRep"
          @reset-block="readerHandlers.resetBlock"
          @block-tap="readerHandlers.setActiveBlock"
          @add-combined-rep="handleCombinedAdd"
          @reset-combined="handleCombinedReset"
        />
        <div v-else class="reader-mushaf-wrapper">
          <MushafReader
            :page-number="pageNumber"
            :reps="mappedReps"
            :active-block-index="tikrar.currentBlockIndex.value"
            :target-reps="settings ? settings.targetReps.value : tikrar.targetReps.value"
            :font-size-scale="mushafFontScale"
            @add-rep="readerHandlers.addRep"
            @reset-block="readerHandlers.resetBlock"
            @block-tap="readerHandlers.setActiveBlock"
          />
          <CombinedSessionCard
            v-if="combinedAvailable"
            :ayah-ids="combinedAyahIds"
            :ayahs-map="mappedAyahs"
            :reps="combinedReps"
            :target-reps="combinedTarget"
            :show-translation="settings?.showTranslation.value !== false"
            variant="mushaf"
            title="Sesi Gabungan"
            @add-rep="handleCombinedAdd"
            @reset="handleCombinedReset"
          />
        </div>
      </template>
    </div>

    <div
      class="reader-nav"
      :class="[
        uiMode === 'app' ? 'reader-nav--app' : 'reader-nav--mushaf',
        isFullscreen ? 'reader-nav--fullscreen' : ''
      ]"
    >
      <button 
        @click="goToPage(pageNumber + 1)"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-colors font-bold text-xl active:scale-95"
        :class="uiMode === 'app' ? 'hover:bg-slate-100 disabled:opacity-30 text-slate-600' : 'hover:bg-[#F5EEDB] disabled:opacity-30 text-[#8B7355]'"
        :disabled="pageNumber >= TOTAL_PAGES"
        aria-label="Halaman selanjutnya"
      >
        <svg class="reader-nav__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
      </button>

      <button
        type="button"
        class="reader-nav__label"
        :class="uiMode === 'app' ? 'reader-nav__label--app' : 'reader-nav__label--mushaf'"
        title="Lihat daftar surah/juz"
        @click="$router.push('/')"
      >
        Hal {{ pageNumber }}
      </button>
      
      <button 
        @click="goToPage(pageNumber - 1)"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-colors font-bold text-xl active:scale-95"
        :class="uiMode === 'app' ? 'hover:bg-slate-100 disabled:opacity-30 text-slate-600' : 'hover:bg-[#F5EEDB] disabled:opacity-30 text-[#8B7355]'"
        :disabled="pageNumber <= 1"
        aria-label="Halaman sebelumnya"
      >
        <svg class="reader-nav__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.reader-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
}

.reader-view--app {
  background: #f8fafc;
}

.reader-view--mushaf {
  background: #E8E0D0;
}

.reader-view--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 50;
  height: 100vh;
}

.reader-topbar {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid transparent;
  position: relative;
}

.reader-topbar--app {
  background: #fff;
  border-color: #e2e8f0;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}

.reader-topbar--mushaf {
  background: #6B5B3E;
  border-color: #5A4C34;
}

.reader-toggle {
  display: flex;
  gap: 0.35rem;
  padding: 0.35rem;
  border-radius: 999px;
}

.reader-toggle--app {
  background: rgba(226, 232, 240, 0.8);
}

.reader-toggle--mushaf {
  background: rgba(0, 0, 0, 0.2);
}

.reader-toggle__btn {
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: #cbd5f5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reader-toggle--app .reader-toggle__btn {
  color: #94a3b8;
}

.reader-toggle__btn.is-active {
  background: #fff;
  color: #059669;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
}

.reader-toggle--mushaf .reader-toggle__btn.is-active {
  background: #C4A882;
  color: #3B2A1A;
  box-shadow: 0 6px 16px rgba(59, 42, 26, 0.2);
}

.reader-toggle__icon {
  font-size: 1rem;
}

.reader-fullscreen {
  position: absolute;
  right: 1rem;
  border: none;
  border-radius: 999px;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reader-fullscreen--app {
  background: #fff;
  color: #94a3b8;
}

.reader-fullscreen--app:hover {
  background: #f1f5f9;
  color: #059669;
}

.reader-fullscreen--mushaf {
  background: rgba(255, 255, 255, 0.1);
  color: #B8AF98;
}

.reader-fullscreen--mushaf:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.reader-fullscreen__icon {
  width: 20px;
  height: 20px;
}

.reader-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.reader-loading {
  padding: 3rem 0;
  display: flex;
  justify-content: center;
}

.reader-spinner {
  width: 32px;
  height: 32px;
  border: 4px solid #22c55e;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.reader-empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: #64748b;
}

.reader-empty__link {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #16a34a;
  text-decoration: underline;
}

.reader-mushaf-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reader-nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 999px;
  padding: 0.35rem 0.5rem;
  border: 1px solid transparent;
  backdrop-filter: blur(12px);
  z-index: 40;
  bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
}

.reader-nav--fullscreen {
  bottom: 2rem;
}

.reader-nav--app {
  background: rgba(255, 255, 255, 0.95);
  border-color: #e2e8f0;
  color: #1f2937;
}

.reader-nav--mushaf {
  background: rgba(253, 251, 247, 0.95);
  border-color: #E8DCC8;
  color: #8B7355;
}

.reader-nav__btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.reader-nav__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.reader-nav__btn--app:hover:not(:disabled) {
  background: #f1f5f9;
}

.reader-nav__btn--mushaf:hover:not(:disabled) {
  background: #F5EEDB;
}

.reader-nav__btn:active {
  transform: scale(0.95);
}

.reader-nav__icon {
  width: 20px;
  height: 20px;
}

.reader-nav__label {
  border: none;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0 1rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.reader-nav__label:active {
  transform: scale(0.95);
}

.reader-nav__label--app {
  color: #1f2937;
}

.reader-nav__label--mushaf {
  color: #6B5B3E;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}

.reader-view--mushaf .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(196, 168, 130, 0.6);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
