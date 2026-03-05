import { ref, computed } from 'vue';
import type { TikrarSession } from '../types/quran';

const STORAGE_KEY = 'quran-tikrar-sessions';

function loadSessions(): Record<string, TikrarSession> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveSessions(sessions: Record<string, TikrarSession>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function ayahKey(surahNumber: number, ayahNumber: number): string {
    return `${surahNumber}-${ayahNumber}`;
}

/**
 * Composable for tikrar (repetition) counter and session tracking.
 */
export function useTikrar() {
    const sessions = ref<Record<string, TikrarSession>>(loadSessions());

    function getCount(surahNumber: number, ayahNumber: number): number {
        const key = ayahKey(surahNumber, ayahNumber);
        return sessions.value[key]?.count ?? 0;
    }

    function increment(surahNumber: number, ayahNumber: number): void {
        const key = ayahKey(surahNumber, ayahNumber);
        const current = sessions.value[key];
        const next: TikrarSession = {
            ayahKey: key,
            count: (current?.count ?? 0) + 1,
            lastAt: new Date().toISOString(),
        };
        sessions.value = { ...sessions.value, [key]: next };
        saveSessions(sessions.value);
    }

    function reset(surahNumber: number, ayahNumber: number): void {
        const key = ayahKey(surahNumber, ayahNumber);
        const next = { ...sessions.value };
        delete next[key];
        sessions.value = next;
        saveSessions(sessions.value);
    }

    function resetAll(): void {
        sessions.value = {};
        saveSessions(sessions.value);
    }

    const totalTikrarCount = computed(() => {
        return Object.values(sessions.value).reduce((sum, s) => sum + s.count, 0);
    });

    return {
        sessions: computed(() => sessions.value),
        getCount,
        increment,
        reset,
        resetAll,
        totalTikrarCount,
    };
}
