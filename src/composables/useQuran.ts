import { ref, type Ref } from 'vue';
import { db } from '../db';
import {
    checkIfSeeded,
    seedSurahs,
    seedInitialPages,
    seedAllPages,
    seedRemainingPages,
    seedPagesForJuz,
    getDownloadedPageNumbers,
} from '../db/seed';
import type { Surah, Ayah, TikrarBlock } from '../types/quran';

/**
 * Composable for Quran data: seed from API and read from IndexedDB.
 */
export function useQuran(): {
    isLoading: Ref<boolean>;
    seedProgress: Ref<number>;
    setupChoicePending: Ref<boolean>;
    initializeDatabase: () => Promise<void>;
    runQuickSetup: () => Promise<void>;
    runFullSetup: () => Promise<void>;
    downloadRemainingPages: (onProgress?: (percent: number) => void) => Promise<void>;
    downloadJuz: (juzNumber: number, onProgress?: (percent: number) => void) => Promise<void>;
    getDownloadedPageCount: () => Promise<number>;
    getSurahList: () => Promise<Surah[]>;
    getPageData: (page: number) => Promise<{ ayahs: Ayah[]; blocks: TikrarBlock[] }>;
    getAyahsBySurah: (surahId: number) => Promise<Ayah[]>;
    getFirstPageOfSurah: (surahId: number) => Promise<number>;
    getPagesInSurah: (surahId: number) => Promise<number[]>;
} {
    const isLoading = ref(false);
    const seedProgress = ref(0);
    const setupChoicePending = ref(false);

    async function initializeDatabase(): Promise<void> {
        isLoading.value = true;
        seedProgress.value = 0;
        setupChoicePending.value = false;
        try {
            const surahCount = await db.surahs.count();
            if (surahCount === 0) {
                await seedSurahs();
            }
            const seeded = await checkIfSeeded();
            if (!seeded) {
                setupChoicePending.value = true;
                return;
            }
            seedProgress.value = 100;
        } finally {
            isLoading.value = false;
        }
    }

    async function runQuickSetup(): Promise<void> {
        setupChoicePending.value = false;
        isLoading.value = true;
        seedProgress.value = 0;
        try {
            await seedInitialPages((percent: number) => {
                seedProgress.value = percent;
            });
            seedProgress.value = 100;
        } finally {
            isLoading.value = false;
        }
    }

    async function runFullSetup(): Promise<void> {
        setupChoicePending.value = false;
        isLoading.value = true;
        seedProgress.value = 0;
        try {
            await seedAllPages((percent: number) => {
                seedProgress.value = percent;
            });
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

    async function downloadJuz(
        juzNumber: number,
        onProgress?: (percent: number) => void
    ): Promise<void> {
        if (juzNumber < 1 || juzNumber > 30) return;
        isLoading.value = true;
        seedProgress.value = 0;
        try {
            await seedPagesForJuz(juzNumber, (percent: number) => {
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
        setupChoicePending,
        initializeDatabase,
        runQuickSetup,
        runFullSetup,
        downloadRemainingPages,
        downloadJuz,
        getDownloadedPageCount,
        getSurahList,
        getPageData,
        getAyahsBySurah,
        getFirstPageOfSurah,
        getPagesInSurah,
    };
}
