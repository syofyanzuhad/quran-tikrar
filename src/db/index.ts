import Dexie, { type Table } from 'dexie';
import type { Ayah, Surah } from '../types/quran';

export interface CachedSurah extends Surah {
    id?: number;
    cachedAt: number;
}

export interface CachedAyah extends Ayah {
    id?: number;
    surahNumber: number;
    cachedAt: number;
}

export class QuranDatabase extends Dexie {
    surahs!: Table<CachedSurah, number>;
    ayahs!: Table<CachedAyah, number>;

    constructor() {
        super('QuranTikrarDB');
        this.version(1).stores({
            surahs: '++id, number, cachedAt',
            ayahs: '++id, surahNumber, numberInSurah, page, cachedAt',
        });
    }
}

export const db = new QuranDatabase();
