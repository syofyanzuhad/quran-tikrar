/**
 * Seed Quran data into IndexedDB.
 * Fetches from API and caches via Dexie.
 */
import axios from 'axios';
import { db } from './index';
import type { Surah, Ayah } from '../types/quran';

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

export async function seedSurahList(): Promise<void> {
    const { data } = await axios.get<{ data: Surah[] }>(`${QURAN_API_BASE}/surah`);
    const surahs = data.data ?? [];
    await db.surahs.clear();
    for (const s of surahs) {
        await db.surahs.add({
            ...s,
            cachedAt: Date.now(),
        });
    }
}

export async function seedSurahAyahs(surahNumber: number): Promise<void> {
    const { data } = await axios.get<{ data: { ayahs: Ayah[] } }>(
        `${QURAN_API_BASE}/surah/${surahNumber}`
    );
    const ayahs = data.data?.ayahs ?? [];
    await db.ayahs.where('surahNumber').equals(surahNumber).delete();
    for (const a of ayahs) {
        await db.ayahs.add({
            ...a,
            surahNumber,
            cachedAt: Date.now(),
        });
    }
}

export async function seedAll(): Promise<void> {
    await seedSurahList();
    // Optionally pre-seed first surah; rest can be lazy-loaded
    await seedSurahAyahs(1);
}
