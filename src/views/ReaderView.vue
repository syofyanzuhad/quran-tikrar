<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSwipe, useFullscreen } from '@vueuse/core';
import AppReader from '../components/reader/AppReader.vue';
import MushafReader from '../components/reader/MushafReader.vue';
import type { ReaderUIMode, TikrarBlockUI } from '../types/reader';
import { getBlockColor } from '../constants/blockColors';

import { useQuran } from '../composables/useQuran';
import { useTikrar } from '../composables/useTikrar';
import { SETTINGS_KEY } from '../composables/useSettings';
import type { SettingsState } from '../composables/useSettings';
import { LAST_PAGE_KEY } from '../constants/storage';
// In case useToast doesn't exist yet, we define a fallback
import { useToast } from '../composables/useToast';

const TOTAL_PAGES = 604;
const route = useRoute();
const router = useRouter();

const settings = inject<SettingsState | null>(SETTINGS_KEY);
const { getPageData } = useQuran();
const tikrar = useTikrar();

// Define useToast with safe fallback
let showToast = (msg: string, _opts?: any) => alert(msg);
try {
  const toastCtx = useToast();
  if (toastCtx && 'addToast' in toastCtx) {
    showToast = (msg: string, _opts?: any) => toastCtx.addToast(msg);
  }
} catch (e) {
  // Ignore missing useToast
}

// -- UI MODE --
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

// -- PAGE LOAD & STATE --
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
  } catch { /* ignore */ }
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

// -- DATA MAPPING FOR NEW READERS --
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

// -- HANDLERS FOR READERS --
const readerHandlers = {
  addRep: (index: number) => tikrar.incrementRep(`page-${pageNumber.value}-block-${index}`),
  resetBlock: (index: number) => tikrar.resetBlock(`page-${pageNumber.value}-block-${index}`),
  setActiveBlock: (index: number) => { tikrar.currentBlockIndex.value = index; }
};

// -- TOASTS --
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

// -- SWIPE TO FLIP --
const readerEl = ref<HTMLElement | null>(null);
useSwipe(readerEl, {
  onSwipeEnd(_e, direction) {
    if (direction === 'left') goToPage(pageNumber.value - 1);
    else if (direction === 'right') goToPage(pageNumber.value + 1);
  },
  threshold: 50,
});

// -- FULLSCREEN --
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(readerEl);
</script>

<template>
  <div ref="readerEl" class="w-full flex flex-col transition-colors duration-300 overflow-hidden" 
       :class="[uiMode === 'app' ? 'bg-[#f8fafc]' : 'bg-[#E8E0D0]', isFullscreen ? 'h-screen fixed inset-0 z-50' : 'h-[100dvh]']"
       :style="!isFullscreen ? { paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' } : {}">
    
    <!-- MODE TOGGLE BAR -->
    <div 
      class="px-4 py-3 flex items-center justify-center shrink-0 border-b transition-colors duration-300 z-30 shadow-sm"
      :class="uiMode === 'app' ? 'bg-white border-slate-200' : 'bg-[#6B5B3E] border-[#5A4C34] shadow-none'"
    >
      <div 
        class="flex bg-opacity-20 rounded-full p-1"
        :class="uiMode === 'app' ? 'bg-slate-200' : 'bg-black/20'"
      >
        <button 
          @click="uiMode = 'app'"
          class="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all"
          :class="uiMode === 'app' 
            ? 'bg-white text-[#059669] shadow-sm' 
            : 'text-slate-400 hover:text-white'"
        >
          <span class="text-base">📱</span> App View
        </button>
        <button 
          @click="uiMode = 'mushaf'"
          class="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all"
          :class="uiMode === 'mushaf' 
            ? 'bg-[#C4A882] text-[#3B2A1A] shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'"
        >
          <span class="text-base">📜</span> Mushaf View
        </button>
      </div>

      <!-- FULLSCREEN TOGGLE -->
      <button 
        @click="toggleFullscreen"
        class="absolute right-4 p-2 rounded-full transition-colors bg-white dark:bg-slate-800"
        :class="uiMode === 'app' ? 'text-slate-400 hover:text-[#059669] hover:bg-slate-100' : 'text-[#B8AF98] hover:text-white hover:bg-black/20'"
        title="Toggle Fullscreen"
      >
        <svg v-if="!isFullscreen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"></path></svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"></path></svg>
      </button>

    </div>

    <!-- MAIN READER AREA -->
    <div class="flex-1 overflow-y-auto relative custom-scrollbar">
      <div v-if="loading && ayahs.length === 0" class="flex justify-center p-12">
        <div class="w-8 h-8 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
      </div>
      
      <div v-else-if="ayahs.length === 0" class="p-8 text-center text-slate-500">
        <p>Halaman ini belum diunduh.</p>
        <router-link to="/pengaturan" class="text-green-600 underline text-sm mt-2 inline-block">Buka Pengaturan</router-link>
      </div>
      
      <component 
        v-else
        :is="uiMode === 'app' ? AppReader : MushafReader"
        :blocks="mappedBlocks"
        :ayahsMap="mappedAyahs"
        :reps="mappedReps"
        :activeBlockIndex="tikrar.currentBlockIndex.value"
        :targetReps="settings ? settings.targetReps.value : tikrar.targetReps.value"
        :showTranslation="settings?.showTranslation.value !== false"
        :pageNumber="pageNumber"
        :surahNameArabic="surahNameArabic"
        @add-rep="readerHandlers.addRep"
        @reset-block="readerHandlers.resetBlock"
        @block-tap="readerHandlers.setActiveBlock"
      />
    </div>

    <!-- PAGE NAVIGATION PILL -->
    <div 
      class="absolute left-1/2 -translate-x-1/2 flex items-center justify-between rounded-full shadow-lg transition-colors border z-40 backdrop-blur-md"
      :class="[
        uiMode === 'app' ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#FDFBF7]/95 border-[#E8DCC8] text-[#8B7355]',
        isFullscreen ? 'bottom-8' : 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]'
      ]"
      style="width: max-content; padding: 0.35rem 0.5rem;"
    >
      <button 
        @click="goToPage(pageNumber + 1)"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-colors font-bold text-xl active:scale-95"
        :class="uiMode === 'app' ? 'hover:bg-slate-100 disabled:opacity-30 text-slate-600' : 'hover:bg-[#F5EEDB] disabled:opacity-30 text-[#8B7355]'"
        :disabled="pageNumber >= TOTAL_PAGES"
        aria-label="Halaman selanjutnya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div 
        class="font-bold text-sm tracking-wide px-4 cursor-pointer active:scale-95 transition-transform"
        :class="uiMode === 'app' ? 'text-slate-800' : 'text-[#6B5B3E]'"
        title="Lihat daftar surah/juz"
        @click="$router.push('/')"
      >
        Hal {{ pageNumber }}
      </div>
      
      <button 
        @click="goToPage(pageNumber - 1)"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-colors font-bold text-xl active:scale-95"
        :class="uiMode === 'app' ? 'hover:bg-slate-100 disabled:opacity-30 text-slate-600' : 'hover:bg-[#F5EEDB] disabled:opacity-30 text-[#8B7355]'"
        :disabled="pageNumber <= 1"
        aria-label="Halaman sebelumnya"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>

  </div>
</template>

<style scoped>
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
.bg-\[\#E8E0D0\] .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(196, 168, 130, 0.6);
}
</style>
