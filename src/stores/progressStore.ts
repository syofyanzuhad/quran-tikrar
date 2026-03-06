import { defineStore } from 'pinia';
import { useProgress } from '../composables/useProgress';

export const useProgressStore = defineStore('progress', () => {
    const {
        completedPages,
        refreshCompletedPages,
        getOverallProgress,
        getJuzProgress,
        getRecentActivity,
        getStreakDays,
        getTodayReps,
    } = useProgress();

    return {
        completedPages,
        refreshCompletedPages,
        getOverallProgress,
        getJuzProgress,
        getRecentActivity,
        getStreakDays,
        getTodayReps,
    };
});
