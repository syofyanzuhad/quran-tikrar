import Dexie, { type Table } from 'dexie';
import type {
    Surah,
    Ayah,
    TikrarBlock,
    TikrarSession,
    HafalanProgress,
    QuranWord,
    MushafLine,
    MushafPage,
    MushafPageBlock
} from '../types/quran';

/**
 * Stored shape for HafalanProgress (IndexedDB serializes Date as string).
 */
export type StoredHafalanProgress = Omit<HafalanProgress, 'lastStudiedAt'> & {
    lastStudiedAt: string;
};

/**
 * Stored shape for TikrarSession (Date | null serialized as string | null).
 */
export type StoredTikrarSession = Omit<TikrarSession, 'completedAt'> & {
    completedAt: string | null;
};

function toHafalanProgress(stored: StoredHafalanProgress): HafalanProgress {
    return {
        ...stored,
        lastStudiedAt: new Date(stored.lastStudiedAt),
    };
}

export class QuranDatabase extends Dexie {
    surahs!: Table<Surah, number>;
    ayahs!: Table<Ayah, number>;
    tikrarBlocks!: Table<TikrarBlock, string>;
    tikrarSessions!: Table<StoredTikrarSession, string>;
    hafalanProgress!: Table<StoredHafalanProgress, string>;
    words!: Table<QuranWord, number>;
    meta!: Table<{ key: string; value: any; seededAt?: Date }, string>;

    constructor() {
        super('QuranTikrarDB');
        this.version(2).stores({
            surahs: 'id, revelationPlace',
            ayahs: 'id, surahId, page, juz, hizb',
            tikrarBlocks: 'id, pageNumber, blockIndex',
            tikrarSessions: 'id, blockId',
            hafalanProgress: 'id, pageNumber, lastStudiedAt',
            words: 'id, ayahId, pageNumber, lineNumber, surahId',
            meta: 'key',
        });
    }

    /**
     * Get all ayahs for a mushaf page (1-604).
     */
    async getPageAyahs(page: number): Promise<Ayah[]> {
        const list = await this.ayahs.where('page').equals(page).sortBy('id');
        return list;
    }

    /**
     * Get tikrar blocks for a mushaf page (1-604).
     */
    async getPageBlocks(page: number): Promise<TikrarBlock[]> {
        return this.tikrarBlocks.where('pageNumber').equals(page).sortBy('blockIndex');
    }

    /**
     * Get all ayahs for a surah (by surah id).
     */
    async getAyahsBySurah(surahId: number): Promise<Ayah[]> {
        return this.ayahs.where('surahId').equals(surahId).sortBy('verseNumber');
    }

    /**
     * Get mushaf page number of the first verse of a surah.
     */
    async getFirstPageOfSurah(surahId: number): Promise<number> {
        const first = await this.ayahs.where('surahId').equals(surahId).first();
        return first?.page ?? 1;
    }

    /**
     * Get sorted list of mushaf page numbers that contain verses of this surah.
     */
    async getPagesInSurah(surahId: number): Promise<number[]> {
        const ayahs = await this.ayahs.where('surahId').equals(surahId).toArray();
        const pages = [...new Set(ayahs.map((a) => a.page))].sort((a, b) => a - b);
        return pages;
    }

    /**
     * Get hafalan progress for a page. Returns undefined if not found.
     */
    async getProgress(pageNum: number): Promise<HafalanProgress | undefined> {
        const id = `page-${pageNum}`;
        const stored = await this.hafalanProgress.get(id);
        if (!stored) return undefined;
        // Dexie may return lastStudiedAt as string from IndexedDB
        const raw = stored as unknown as StoredHafalanProgress;
        return toHafalanProgress(raw);
    }

    /**
     * Insert or update hafalan progress. Converts Date to ISO string for storage.
     */
    async upsertProgress(progress: HafalanProgress): Promise<string> {
        const stored: StoredHafalanProgress = {
            ...progress,
            lastStudiedAt:
                progress.lastStudiedAt instanceof Date
                    ? progress.lastStudiedAt.toISOString()
                    : (progress.lastStudiedAt as unknown as string),
        };
        await this.hafalanProgress.put(stored);
        return progress.id;
    }

    /**
     * Get all words for a page, sorted by lineNumber then position
     */
    async getPageWords(pageNumber: number): Promise<QuranWord[]> {
        const words = await this.words.where('pageNumber').equals(pageNumber).toArray();
        return words.sort((a, b) => {
            if (a.lineNumber === b.lineNumber) {
                if (a.ayahId !== b.ayahId) {
                    return a.ayahId - b.ayahId;
                }
                return a.position - b.position;
            }
            return a.lineNumber - b.lineNumber;
        });
    }

    /**
     * Get lines for a mushaf page, grouped by lineNumber and assigned a blockIndex
     */
    async getPageLines(pageNumber: number): Promise<MushafLine[]> {
        const words = await this.getPageWords(pageNumber);
        
        const linesMap = new Map<number, MushafLine>();
        
        for (let i = 1; i <= 15; i++) {
            let blockIndex = 0;
            if (i >= 5 && i <= 8) blockIndex = 1;
            else if (i >= 9 && i <= 12) blockIndex = 2;
            else if (i >= 13 && i <= 15) blockIndex = 3;
            
            linesMap.set(i, {
                lineNumber: i,
                pageNumber,
                words: [],
                isBismillah: false,
                isAyahEnd: false,
                blockIndex
            });
        }
        
        words.forEach(word => {
            const line = linesMap.get(word.lineNumber);
            if (line) {
                line.words.push(word);
                // Detect Surah breaks (a new surah starting on a line)
                // A Surah break happens exactly when we hit Verse 1 of any Surah.
                if (word.charType !== 'end' && word.charType !== 'pause' && word.charType !== 'sajdah') {
                    if (word.verseNumber === 1 && line.surahBreakArabic === undefined) {
                        // Mark this line as containing a surah break
                        // We only set it once per line to avoid overwriting if a line has multiple words
                        line.surahBreakArabic = ''; 
                    }
                }
            }
        });
        
        // Post process to set isAyahEnd and populate Arabic Surah Names
        const processedLines = await Promise.all(Array.from(linesMap.values()).map(async line => {
            if (line.words.length > 0) {
                const lastWord = line.words[line.words.length - 1];
                if (lastWord && lastWord.charType === 'end') {
                    line.isAyahEnd = true;
                }

                // If this line was marked as a surah break, fetch its Arabic name
                if (line.surahBreakArabic !== undefined) {
                    const validWord = line.words.find(w => w.charType !== 'end' && w.charType !== 'pause');
                    if (validWord) {
                        const surah = await this.surahs.get(validWord.surahId);
                        if (surah) {
                            line.surahBreakArabic = surah.nameArabic;
                        }
                    }
                }
                
                // Detect standalone Bismillah lines (typically less than 5 words containing 'بسم الله')
                if (line.words.length > 0 && line.words.length <= 4 && !line.surahBreakArabic) {
                     const textString = line.words.map(w => w.textUthmani).join(' ').trim();
                     if (textString.includes('بِسْمِ ٱللَّهِ') || textString.includes('بسم الله')) {
                         line.isBismillah = true;
                     }
                }
            }
            return line;
        }));
        
        return processedLines;
    }

    /**
     * Builds a complete MushafPage object with blocks array
     */
    async getPageData(pageNumber: number): Promise<MushafPage> {
        const lines = await this.getPageLines(pageNumber);
        
        let surahId = 1;
        let juz = 1;
        let hizb = 1;
        let surahNameArabic = '';
        
        const firstValidWord = lines.flatMap(l => l.words).find(w => w);
        if (firstValidWord) {
            surahId = firstValidWord.surahId;
            const surah = await this.surahs.get(surahId);
            if (surah) surahNameArabic = surah.nameArabic;
            
            const ayah = await this.ayahs.get(firstValidWord.ayahId);
            if (ayah) {
                juz = ayah.juz;
                hizb = ayah.hizb;
            }
        }
        
        const blocks: MushafPageBlock[] = [];
        const ranges = [
            { index: 0, start: 1, end: 4 },
            { index: 1, start: 5, end: 8 },
            { index: 2, start: 9, end: 12 },
            { index: 3, start: 13, end: 15 },
        ];
        
        ranges.forEach(range => {
            const blockLines = lines.filter(l => l.lineNumber >= range.start && l.lineNumber <= range.end);
            blocks.push({
                blockIndex: range.index,
                lineStart: range.start,
                lineEnd: range.end,
                lines: blockLines,
                ayahRange: '' // Can be populated if needed
            });
        });
        
        return {
            pageNumber,
            juz,
            hizb,
            surahId,
            surahNameArabic,
            lines,
            blocks
        };
    }
}

export const db = new QuranDatabase();
