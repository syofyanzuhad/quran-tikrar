/**
 * TypeScript interfaces for Quran Tikrar app.
 */

export interface Surah {
    id: number;
    nameArabic: string;
    nameSimple: string;
    nameTranslation: string;
    versesCount: number;
    revelationPlace: 'makkah' | 'madinah';
}

export interface Ayah {
    id: number; // unique global id
    surahId: number;
    verseNumber: number;
    textArab: string;
    textIndoTranslation: string;
    page: number; // halaman mushaf (1-604)
    juz: number;
    hizb: number;
}

export type TikrarBlockColor = 'yellow' | 'green' | 'blue' | 'orange';

export interface TikrarBlock {
    id: string; // "page-{pageNum}-block-{blockNum}"
    pageNumber: number;
    blockIndex: number; // 0-3 (4 blok per halaman)
    ayahIds: number[];
    color: TikrarBlockColor;
    targetReps: number; // default: 20
}

export interface TikrarSession {
    id: string;
    blockId: string;
    repetitions: number;
    completedAt: Date | null;
    isCompleted: boolean;
}

export interface HafalanProgress {
    id: string; // "page-{pageNum}"
    pageNumber: number;
    surahId: number;
    blocksCompleted: number; // 0-4
    totalBlocks: number; // selalu 4
    isPageCompleted: boolean;
    lastStudiedAt: Date;
    totalReps: number;
}
