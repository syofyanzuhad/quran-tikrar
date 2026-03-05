/**
 * TypeScript interfaces for Quran data and app state.
 */

export interface Ayah {
    number: number;
    text: string;
    numberInSurah: number;
    juz: number;
    manzil: number;
    page: number;
    ruku: number;
    hizbQuarter: number;
    sajda?: { recommended: boolean; obligatory: boolean };
}

export interface Surah {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: 'Meccan' | 'Medinan';
    numberOfAyahs: number;
    ayahs?: Ayah[];
}

export interface Juz {
    number: number;
    start: { surah: number; ayah: number };
    end: { surah: number; ayah: number };
}

export interface QuranPage {
    page: number;
    ayahs: Ayah[];
}

export interface TikrarSession {
    ayahKey: string;
    count: number;
    lastAt: string;
}

export interface ProgressRecord {
    surahNumber: number;
    ayahFrom: number;
    ayahTo: number;
    page: number;
    completedAt: string;
}
