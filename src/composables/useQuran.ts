import { ref, computed } from 'vue';
import axios from 'axios';
import { db } from '../db';
import { seedSurahAyahs } from '../db/seed';
import type { Surah, Ayah } from '../types/quran';

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

/**
 * Composable for fetching and caching Quran data (surahs + ayahs).
 */
export function useQuran() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    const surahs = ref<Surah[]>([]);

    async function fetchSurahList(): Promise<Surah[]> {
        loading.value = true;
        error.value = null;
        try {
            const cached = await db.surahs.orderBy('number').toArray();
            if (cached.length > 0) {
                surahs.value = cached.map((c) => ({
                    number: c.number,
                    name: c.name,
                    englishName: c.englishName,
                    englishNameTranslation: c.englishNameTranslation,
                    revelationType: c.revelationType,
                    numberOfAyahs: c.numberOfAyahs,
                }));
                return surahs.value;
            }
            const { data } = await axios.get<{ data: Surah[] }>(`${QURAN_API_BASE}/surah`);
            const list = data.data ?? [];
            surahs.value = list;
            await db.surahs.clear();
            for (const s of list) {
                await db.surahs.add({ ...s, cachedAt: Date.now() });
            }
            return list;
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch surah list';
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchAyahs(surahNumber: number): Promise<Ayah[]> {
        loading.value = true;
        error.value = null;
        try {
            const cached = await db.ayahs.where('surahNumber').equals(surahNumber).toArray();
            if (cached.length > 0) {
                return cached
                    .sort((a, b) => a.numberInSurah - b.numberInSurah)
                    .map((c) => ({
                        number: c.number,
                        text: c.text,
                        numberInSurah: c.numberInSurah,
                        juz: c.juz,
                        manzil: c.manzil,
                        page: c.page,
                        ruku: c.ruku,
                        hizbQuarter: c.hizbQuarter,
                        sajda: c.sajda,
                    }));
            }
            await seedSurahAyahs(surahNumber);
            const fresh = await db.ayahs.where('surahNumber').equals(surahNumber).toArray();
            return fresh
                .sort((a, b) => a.numberInSurah - b.numberInSurah)
                .map((c) => ({
                    number: c.number,
                    text: c.text,
                    numberInSurah: c.numberInSurah,
                    juz: c.juz,
                    manzil: c.manzil,
                    page: c.page,
                    ruku: c.ruku,
                    hizbQuarter: c.hizbQuarter,
                    sajda: c.sajda,
                }));
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch ayahs';
            return [];
        } finally {
            loading.value = false;
        }
    }

    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        surahs: computed(() => surahs.value),
        fetchSurahList,
        fetchAyahs,
    };
}
