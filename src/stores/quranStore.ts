import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Surah, Ayah } from '../types/quran';
import { useQuran } from '../composables/useQuran';

export const useQuranStore = defineStore('quran', () => {
    const { fetchSurahList, fetchAyahs, loading, error } = useQuran();

    const surahs = ref<Surah[]>([]);
    const currentSurah = ref<Surah | null>(null);
    const currentAyahs = ref<Ayah[]>([]);

    async function loadSurahList() {
        const list = await fetchSurahList();
        surahs.value = list;
        return list;
    }

    async function loadSurah(number: number) {
        const list = await fetchSurahList();
        currentSurah.value = list.find((s) => s.number === number) ?? null;
        currentAyahs.value = await fetchAyahs(number);
        return currentAyahs.value;
    }

    function clearCurrent() {
        currentSurah.value = null;
        currentAyahs.value = [];
    }

    return {
        loading,
        error,
        surahs: computed(() => surahs.value),
        currentSurah: computed(() => currentSurah.value),
        currentAyahs: computed(() => currentAyahs.value),
        loadSurahList,
        loadSurah,
        clearCurrent,
    };
});
