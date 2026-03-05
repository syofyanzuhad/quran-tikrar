import { defineStore } from 'pinia';
import { useProgress } from '../composables/useProgress';

export const useProgressStore = defineStore('progress', () => {
    const {
        records,
        addRecord,
        clearRecords,
        completedPages,
        totalPagesCompleted,
    } = useProgress();

    return {
        records,
        addRecord,
        clearRecords,
        completedPages,
        totalPagesCompleted,
    };
});
