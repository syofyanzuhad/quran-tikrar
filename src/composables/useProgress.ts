import { ref, computed } from 'vue';
import type { ProgressRecord } from '../types/quran';

const STORAGE_KEY = 'quran-progress-records';

function loadRecords(): ProgressRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveRecords(records: ProgressRecord[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Composable for memorization progress (pages/ayahs completed).
 */
export function useProgress() {
    const records = ref<ProgressRecord[]>(loadRecords());

    function addRecord(record: Omit<ProgressRecord, 'completedAt'>): void {
        records.value = [
            ...records.value,
            { ...record, completedAt: new Date().toISOString() },
        ];
        saveRecords(records.value);
    }

    function clearRecords(): void {
        records.value = [];
        saveRecords(records.value);
    }

    const completedPages = computed(() => {
        const set = new Set(records.value.map((r: ProgressRecord) => r.page));
        return Array.from(set).sort((a: number, b: number) => a - b);
    });

    const totalPagesCompleted = computed(() => completedPages.value.length);

    return {
        records: computed(() => records.value),
        addRecord,
        clearRecords,
        completedPages,
        totalPagesCompleted,
    };
}
