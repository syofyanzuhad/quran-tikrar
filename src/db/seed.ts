/**
 * Seed Quran data from quran.com API v4 into IndexedDB.
 */
import { ref } from 'vue';
import { db } from './index';
import { JUZ_PAGE_RANGES } from '../constants/juz';
import type { Surah, Ayah, TikrarBlock, TikrarBlockColor, QuranWord } from '../types/quran';

const API_BASE = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = 33; // Bahasa Indonesia
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const PAGE_DELAY_MS = 100;
const TOTAL_PAGES = 604;
const BLOCK_COLORS: TikrarBlockColor[] = ['yellow', 'green', 'blue', 'orange'];

/** Page 1 = Surah Al-Fatihah. Juz 30 (Amma) in 604-page mushaf = pages 582–604. */
export const INITIAL_PAGE_NUMBERS: number[] = [
    1,
    ...Array.from({ length: 604 - 582 + 1 }, (_, i) => 582 + i),
];

interface ChapterResponse {
    id: number;
    revelation_place: 'makkah' | 'madinah';
    name_simple: string;
    name_arabic: string;
    verses_count: number;
    translated_name: { name: string };
}

interface ChaptersApiResponse {
    chapters: ChapterResponse[];
}

interface VerseTranslation {
    resource_id: number;
    text: string;
}

interface VerseWordResponse {
    id: number;
    position: number;
    text_uthmani: string;
    line_number: number;
    char_type_name: 'word' | 'end' | 'pause' | 'sajdah';
}

interface VerseResponse {
    id: number;
    chapter_id: number;
    verse_number: number;
    verse_key: string;
    text_uthmani: string;
    page_number: number;
    juz_number: number;
    hizb_number: number;
    translations: VerseTranslation[];
    words: VerseWordResponse[];
}


interface VersesApiResponse {
    verses: VerseResponse[];
}

async function fetchWithRetry<T>(url: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const data = (await res.json()) as T;
            return data;
        } catch (err) {
            lastError = err;
            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }
    throw lastError;
}

/**
 * Check if database has been seeded (surahs and at least one page of ayahs).
 */
export async function checkIfSeeded(): Promise<boolean> {
    const surahCount = await db.surahs.count();
    if (surahCount === 0) return false;
    const ayahCount = await db.ayahs.count();
    return ayahCount > 0;
}

/**
 * Fetch all chapters from API and save to db.surahs.
 */
export async function seedSurahs(): Promise<void> {
    const url = `${API_BASE}/chapters`;
    const data = await fetchWithRetry<ChaptersApiResponse>(url);
    const chapters = data.chapters ?? [];
    if (chapters.length === 0) {
        throw new Error('No chapters returned from API');
    }
    await db.surahs.clear();
    const surahs: Surah[] = chapters.map((c) => ({
        id: c.id,
        nameArabic: c.name_arabic,
        nameSimple: c.name_simple,
        nameTranslation: c.translated_name?.name ?? c.name_simple,
        versesCount: c.verses_count,
        revelationPlace: c.revelation_place,
    }));
    await db.surahs.bulkAdd(surahs);
}

/**
 * Distribute ayah ids into 4 blocks as evenly as possible. Always returns 4 arrays.
 */
function splitIntoBlocks(ayahIds: number[]): number[][] {
    const n = ayahIds.length;
    const blocks: number[][] = [[], [], [], []];
    for (let i = 0; i < n; i++) {
        const blockIndex = Math.min(3, Math.floor((i * 4) / n));
        const block = blocks[blockIndex];
        const id = ayahIds[i];
        if (block !== undefined && id !== undefined) block.push(id);
    }
    return blocks;
}

/**
 * Fetch verses for one page, save ayahs and create 4 tikrar blocks.
 */
export async function seedPage(pageNumber: number): Promise<void> {
    const url = `${API_BASE}/verses/by_page/${pageNumber}?words=true&word_fields=text_uthmani,line_number,position,char_type_name&per_page=50&translations=${TRANSLATION_ID}&fields=text_uthmani,page_number,juz_number,hizb_number`;
    const data = await fetchWithRetry<VersesApiResponse>(url);
    const verses = data.verses ?? [];
    if (verses.length === 0) return;

    const ayahs: Ayah[] = [];
    const wordsToInsert: QuranWord[] = [];

    for (const v of verses) {
        const surahId = v.chapter_id ?? Number.parseInt(v.verse_key.split(':')[0] ?? '1', 10);
        const translationText =
            v.translations?.find((t) => t.resource_id === TRANSLATION_ID)?.text ?? '';
        
        ayahs.push({
            id: v.id,
            surahId,
            verseNumber: v.verse_number,
            textArab: v.text_uthmani ?? '',
            textIndoTranslation: translationText,
            page: v.page_number ?? pageNumber,
            juz: v.juz_number ?? 1,
            hizb: v.hizb_number ?? 1,
        });

        if (v.words && Array.isArray(v.words)) {
            for (const w of v.words) {
                wordsToInsert.push({
                    id: w.id,
                    ayahId: v.id,
                    surahId: surahId,
                    verseNumber: v.verse_number,
                    position: w.position,
                    textUthmani: w.text_uthmani,
                    lineNumber: w.line_number, // The API provides standard 15 lines max per page
                    pageNumber: pageNumber,
                    charType: w.char_type_name
                });
            }
        }
    }

    await db.ayahs.bulkPut(ayahs);
    if (wordsToInsert.length > 0) {
        await db.words.bulkPut(wordsToInsert);
    }

    const ayahIds = ayahs.map((a) => a.id);
    const blockAyahIds = splitIntoBlocks(ayahIds);

    const blocks: TikrarBlock[] = blockAyahIds.map((ids, blockIndex) => ({
        id: `page-${pageNumber}-block-${blockIndex}`,
        pageNumber,
        blockIndex,
        ayahIds: ids,
        color: BLOCK_COLORS[blockIndex] ?? 'yellow',
        targetReps: 20,
    }));

    // Only bulkPut tikrar blocks if they do not exist, to prevent overwriting user progress
    const existingBlocks = await db.tikrarBlocks.where('pageNumber').equals(pageNumber).toArray();
    if (existingBlocks.length === 0) {
        await db.tikrarBlocks.bulkPut(blocks);
    }
}

export type SeedProgressCallback = (percent: number) => void;

/**
 * Seed a subset of pages with progress reporting.
 */
export async function seedPages(
    pageNumbers: number[],
    onProgress?: SeedProgressCallback
): Promise<void> {
    const total = pageNumbers.length;
    for (let i = 0; i < total; i++) {
        await seedPage(pageNumbers[i]!);
        const percent = total === 0 ? 100 : Math.round(((i + 1) / total) * 100);
        onProgress?.(percent);
        if (i < total - 1) {
            await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
        }
    }
}

/**
 * Seed only initial content: Surah 1 (page 1) and Juz 30 (pages 582–604).
 * Used on first app load; remaining pages can be downloaded from Settings.
 */
export async function seedInitialPages(onProgress?: SeedProgressCallback): Promise<void> {
    await seedPages(INITIAL_PAGE_NUMBERS, onProgress);
}

/**
 * Return set of mushaf page numbers that already have ayahs in the DB.
 */
export async function getDownloadedPageNumbers(): Promise<number[]> {
    const ayahs = await db.ayahs.toArray();
    const pageSet = new Set(ayahs.map((a) => a.page));
    return [...pageSet].sort((a, b) => a - b);
}

/**
 * Seed all pages 1–604 that are not yet in the DB. Use from Settings to download rest.
 */
export async function seedRemainingPages(onProgress?: SeedProgressCallback): Promise<void> {
    const downloaded = await getDownloadedPageNumbers();
    const downloadedSet = new Set(downloaded);
    const missing: number[] = [];
    for (let p = 1; p <= TOTAL_PAGES; p++) {
        if (!downloadedSet.has(p)) missing.push(p);
    }
    if (missing.length === 0) {
        onProgress?.(100);
        return;
    }
    await seedPages(missing, onProgress);
}

/**
 * Seed only pages for one juz (1–30) that are not yet in the DB.
 */
export async function seedPagesForJuz(
    juzNumber: number,
    onProgress?: SeedProgressCallback
): Promise<void> {
    const range = JUZ_PAGE_RANGES[juzNumber - 1];
    if (!range) return;
    const [start, end] = range;
    const downloaded = await getDownloadedPageNumbers();
    const downloadedSet = new Set(downloaded);
    const missing: number[] = [];
    for (let p = start; p <= end; p++) {
        if (!downloadedSet.has(p)) missing.push(p);
    }
    if (missing.length === 0) {
        onProgress?.(100);
        return;
    }
    await seedPages(missing, onProgress);
}

/**
 * Seed all pages 1-604 with rate limiting and progress reporting.
 * @deprecated Prefer seedInitialPages on first run and seedRemainingPages from Settings.
 */
export const seedProgress = ref<{
    phase: 'idle' | 'seeding' | 'done' | 'error';
    current: number;
    total: number;
    percentage: number;
    failedPages: number[];
}>({
    phase: 'idle',
    current: 0,
    total: TOTAL_PAGES,
    percentage: 0,
    failedPages: [],
});

/**
 * Fix migrated word data for users who downloaded ayahs before words were introduced to Quick Setup.
 */
export async function fixMissingWords(onProgress?: SeedProgressCallback): Promise<void> {
    const downloadedPages = await getDownloadedPageNumbers();
    if (downloadedPages.length === 0) return;

    const wordCount = await db.words.count();
    if (wordCount > 0) return; // Assume migrated already

    const total = downloadedPages.length;
    for (let i = 0; i < total; i++) {
        await seedPage(downloadedPages[i]!); // seedPage will skip tikrar blocks if they exist
        onProgress?.(Math.round(((i + 1) / total) * 100));
        if (i < total - 1) {
            await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
        }
    }
}

