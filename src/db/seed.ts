/**
 * Seed Quran data from quran.com API v4 into IndexedDB.
 */
import { db } from './index';
import type { Surah, Ayah, TikrarBlock, TikrarBlockColor } from '../types/quran';

const API_BASE = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = 33; // Bahasa Indonesia
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const PAGE_DELAY_MS = 100;
const TOTAL_PAGES = 604;
const BLOCK_COLORS: TikrarBlockColor[] = ['yellow', 'green', 'blue', 'orange'];

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

interface VerseResponse {
    id: number;
    verse_number: number;
    verse_key: string;
    text_uthmani: string;
    page_number: number;
    juz_number: number;
    hizb_number: number;
    translations: VerseTranslation[];
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
    const url = `${API_BASE}/verses/by_page/${pageNumber}?words=false&translations=${TRANSLATION_ID}&fields=text_uthmani,page_number,juz_number,hizb_number`;
    const data = await fetchWithRetry<VersesApiResponse>(url);
    const verses = data.verses ?? [];
    if (verses.length === 0) return;

    const ayahs: Ayah[] = verses.map((v) => {
        const surahId = Number.parseInt(v.verse_key.split(':')[0] ?? '1', 10);
        const translationText =
            v.translations?.find((t) => t.resource_id === TRANSLATION_ID)?.text ?? '';
        return {
            id: v.id,
            surahId,
            verseNumber: v.verse_number,
            textArab: v.text_uthmani ?? '',
            textIndoTranslation: translationText,
            page: v.page_number,
            juz: v.juz_number,
            hizb: v.hizb_number,
        };
    });

    await db.ayahs.bulkPut(ayahs);

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

    await db.tikrarBlocks.bulkPut(blocks);
}

export type SeedProgressCallback = (percent: number) => void;

/**
 * Seed all pages 1-604 with rate limiting and progress reporting.
 */
export async function seedAllPages(onProgress?: SeedProgressCallback): Promise<void> {
    for (let page = 1; page <= TOTAL_PAGES; page++) {
        await seedPage(page);
        const percent = Math.round((page / TOTAL_PAGES) * 100);
        onProgress?.(percent);
        if (page < TOTAL_PAGES) {
            await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
        }
    }
}
