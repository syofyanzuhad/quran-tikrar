import Dexie, { type Table } from 'dexie';
import type {
    Surah,
    Ayah,
    TikrarBlock,
    TikrarSession,
    HafalanProgress,
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

    constructor() {
        super('QuranTikrarDB');
        this.version(2).stores({
            surahs: 'id, revelationPlace',
            ayahs: 'id, surahId, page, juz, hizb',
            tikrarBlocks: 'id, pageNumber, blockIndex',
            tikrarSessions: 'id, blockId',
            hafalanProgress: 'id, pageNumber, lastStudiedAt',
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
}

export const db = new QuranDatabase();
