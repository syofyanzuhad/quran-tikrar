import { ref, type Ref } from 'vue';
import { db } from '../db';
import {
    checkIfSeeded,
    seedSurahs,
    seedInitialPages,
    seedRemainingPages,
    getDownloadedPageNumbers,
} from '../db/seed';
import type { Surah, Ayah, TikrarBlock } from '../types/quran';

/**
 * Composable for Quran data: seed from API and read from IndexedDB.
 */
export function useQuran(): {
    isLoading: Ref<boolean>;
    seedProgress: Ref<number>;
    initializeDatabase: () => Promise<void>;
    downloadRemainingPages: (onProgress?: (percent: number) => void) => Promise<void>;
    getDownloadedPageCount: () => Promise<number>;
    getSurahList: () => Promise<Surah[]>;
    getPageData: (page: number) => Promise<{ ayahs: Ayah[]; blocks: TikrarBlock[] }>;
    getAyahsBySurah: (surahId: number) => Promise<Ayah[]>;
    getFirstPageOfSurah: (surahId: number) => Promise<number>;
    getPagesInSurah: (surahId: number) => Promise<number[]>;
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
                await seedInitialPages((percent: number) => {
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

    async function getFirstPageOfSurah(surahId: number): Promise<number> {
        return db.getFirstPageOfSurah(surahId);
    }

    async function getPagesInSurah(surahId: number): Promise<number[]> {
        return db.getPagesInSurah(surahId);
    }

    async function downloadRemainingPages(
        onProgress?: (percent: number) => void
    ): Promise<void> {
        isLoading.value = true;
        seedProgress.value = 0;
        try {
            await seedRemainingPages((percent: number) => {
                seedProgress.value = percent;
            });
            onProgress?.(100);
        } finally {
            isLoading.value = false;
        }
    }

    async function getDownloadedPageCount(): Promise<number> {
        const pages = await getDownloadedPageNumbers();
        return pages.length;
    }

    return {
        isLoading,
        seedProgress,
        initializeDatabase,
        downloadRemainingPages,
        getDownloadedPageCount,
        getSurahList,
        getPageData,
        getAyahsBySurah,
        getFirstPageOfSurah,
        getPagesInSurah,
    };
}
