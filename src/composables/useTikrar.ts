import { ref, computed } from 'vue';

/** Per-ayah tikrar count (localStorage); distinct from DB TikrarSession. */
interface TikrarAyahCount {
    ayahKey: string;
    count: number;
    lastAt: string;
}

const STORAGE_KEY = 'quran-tikrar-sessions';

function loadSessions(): Record<string, TikrarAyahCount> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, TikrarAyahCount>) : {};
    } catch {
        return {};
    }
}

function saveSessions(sessions: Record<string, TikrarAyahCount>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function ayahKey(surahNumber: number, ayahNumber: number): string {
    return `${surahNumber}-${ayahNumber}`;
}

/**
 * Composable for tikrar (repetition) counter per ayah (localStorage).
 */
export function useTikrar() {
    const sessions = ref<Record<string, TikrarAyahCount>>(loadSessions());

    function getCount(surahNumber: number, ayahNumber: number): number {
        const key = ayahKey(surahNumber, ayahNumber);
        return sessions.value[key]?.count ?? 0;
    }

    function increment(surahNumber: number, ayahNumber: number): void {
        const key = ayahKey(surahNumber, ayahNumber);
        const current = sessions.value[key];
        const next: TikrarAyahCount = {
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
