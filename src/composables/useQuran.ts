import { ref, type Ref } from 'vue';
import { db } from '../db';
import {
    checkIfSeeded,
    seedSurahs,
    seedAllPages,
} from '../db/seed';
import type { Surah, Ayah, TikrarBlock } from '../types/quran';

/**
 * Composable for Quran data: seed from API and read from IndexedDB.
 */
export function useQuran(): {
    isLoading: Ref<boolean>;
    seedProgress: Ref<number>;
    initializeDatabase: () => Promise<void>;
    getSurahList: () => Promise<Surah[]>;
    getPageData: (page: number) => Promise<{ ayahs: Ayah[]; blocks: TikrarBlock[] }>;
    getAyahsBySurah: (surahId: number) => Promise<Ayah[]>;
} {
    const isLoading = ref(false);
    const seedProgress = ref(0);

    async function initializeDatabase(): Promise<void> {
        isLoading.value = true;
        seedProgress.value = 0;
        try {
            const seeded = await checkIfSeeded();
            if (!seeded) {
                await seedSurahs();
                await seedAllPages((percent: number) => {
                    seedProgress.value = percent;
                });
            }
            seedProgress.value = 100;
        } finally {
            isLoading.value = false;
        }
    }

    async function getSurahList(): Promise<Surah[]> {
        const list = await db.surahs.orderBy('id').toArray();
        return list;
    }

    async function getPageData(
        page: number
    ): Promise<{ ayahs: Ayah[]; blocks: TikrarBlock[] }> {
        const [ayahs, blocks] = await Promise.all([
            db.getPageAyahs(page),
            db.getPageBlocks(page),
        ]);
        return { ayahs, blocks };
    }

    async function getAyahsBySurah(surahId: number): Promise<Ayah[]> {
        return db.ayahs.where('surahId').equals(surahId).sortBy('verseNumber');
    }

    return {
        isLoading,
        seedProgress,
        initializeDatabase,
        getSurahList,
        getPageData,
        getAyahsBySurah,
    };
}
