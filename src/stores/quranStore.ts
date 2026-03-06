import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Surah, Ayah } from '../types/quran';
import { useQuran } from '../composables/useQuran';

export const useQuranStore = defineStore('quran', () => {
    const {
        isLoading,
        getSurahList,
        getAyahsBySurah,
    } = useQuran();

    const surahs = ref<Surah[]>([]);
    const currentSurah = ref<Surah | null>(null);
    const currentAyahs = ref<Ayah[]>([]);
    const error = ref<string | null>(null);

    async function loadSurahList() {
        error.value = null;
        try {
            const list = await getSurahList();
            surahs.value = list;
            return list;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to load surah list';
            return [];
        }
    }

    async function loadSurah(surahId: number) {
        error.value = null;
        try {
            const list = await getSurahList();
            currentSurah.value = list.find((s: Surah) => s.id === surahId) ?? null;
            currentAyahs.value = await getAyahsBySurah(surahId);
            return currentAyahs.value;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to load surah';
            return [];
        }
    }

    function clearCurrent() {
        currentSurah.value = null;
        currentAyahs.value = [];
    }

    return {
        loading: isLoading,
        error: computed(() => error.value),
        surahs: computed(() => surahs.value),
        currentSurah: computed(() => currentSurah.value),
        currentAyahs: computed(() => currentAyahs.value),
        loadSurahList,
        loadSurah,
        clearCurrent,
    };
});
