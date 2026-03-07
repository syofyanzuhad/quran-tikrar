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

/** Legacy: simple progress record for UI (surah/ayah range completed). */
export interface ProgressRecord {
    surahNumber: number;
    ayahFrom: number;
    ayahTo: number;
    page: number;
    completedAt: string;
}

// A single Arabic word with its position metadata
export interface QuranWord {
    id: number;              // unique word id from quran.com
    ayahId: number;          // parent ayah global id
    surahId: number;
    verseNumber: number;
    position: number;        // word position within the ayah (1-based)
    textUthmani: string;     // Arabic text of this word
    lineNumber: number;      // which line on the mushaf page (1–15)
    pageNumber: number;      // mushaf page (1–604)
    charType: 'word' | 'end' | 'pause' | 'sajdah';
}

// A single rendered line on the mushaf page
export interface MushafLine {
    lineNumber: number;      // 1–15
    pageNumber: number;
    words: QuranWord[];
    isBismillah: boolean;    // true for the Basmala line
    isAyahEnd: boolean;      // true if this line ends an ayah
    surahBreakArabic?: string; // If this line starts a new Surah, this holds its Arabic name
    blockIndex: number;      // 0–3 which Tikrar color block this line belongs to
}

export interface MushafPageBlock {
    blockIndex: number;      // 0–3
    lineStart: number;       // 1, 5, 9, or 13
    lineEnd: number;         // 4, 8, 12, or 15
    lines: MushafLine[];
    ayahRange: string;       // e.g. "Al-Fatihah 1–2" for display
}

// A full mushaf page with lines grouped into 4 Tikrar blocks
export interface MushafPage {
    pageNumber: number;
    juz: number;
    hizb: number;
    surahId: number;
    surahNameArabic: string;
    lines: MushafLine[];     // always 15 items
    blocks: MushafPageBlock[];  // always 4 items
}
