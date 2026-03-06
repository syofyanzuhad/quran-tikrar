import { computed, ref } from 'vue';
import { db, type StoredHafalanProgress, type StoredTikrarSession } from '../db';
import type { HafalanProgress } from '../types/quran';

export interface JuzProgressPageDetail {
    pageNumber: number;
    surahId: number;
    isCompleted: boolean;
    blocksCompleted: number;
    totalBlocks: number;
    totalReps: number;
    lastStudiedAt: Date | null;
}

export interface JuzProgress {
    juzNumber: number;
    totalPages: number;
    completedPages: number;
    percentage: number;
    status: 'not_started' | 'in_progress' | 'completed';
    pages: JuzProgressPageDetail[];
}

function toHafalanProgress(stored: StoredHafalanProgress): HafalanProgress {
    return {
        ...stored,
        lastStudiedAt: new Date(stored.lastStudiedAt),
    };
}

function toDateOnlyKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/**
 * Dexie-backed progress queries for Tikrar hafalan tracking.
 * All data is read offline from IndexedDB.
 */
export function useProgress() {
    const completedPages = ref<number[]>([]);

    async function refreshCompletedPages(): Promise<void> {
        const list = await db.hafalanProgress.toArray();
        const pages = (list as unknown as StoredHafalanProgress[])
            .filter((p) => p.isPageCompleted)
            .map((p) => p.pageNumber);
        completedPages.value = Array.from(new Set(pages)).sort((a, b) => a - b);
    }

    async function getOverallProgress(): Promise<{
        totalPages: number;
        completedPages: number;
        percentage: number;
    }> {
        const totalPages: number = 604;
        const list = await db.hafalanProgress.toArray();
        const completed = (list as unknown as StoredHafalanProgress[]).filter(
            (p) => p.isPageCompleted
        ).length;
        const percentage = Math.round((completed / totalPages) * 1000) / 10;
        return { totalPages, completedPages: completed, percentage };
    }

    async function getRecentActivity(limit: number): Promise<HafalanProgress[]> {
        const rows = await db.hafalanProgress
            .orderBy('lastStudiedAt')
            .reverse()
            .limit(Math.max(0, limit))
            .toArray();

        return (rows as unknown as StoredHafalanProgress[]).map(toHafalanProgress);
    }

    async function getStreakDays(): Promise<number> {
        const rows = await db.hafalanProgress.orderBy('lastStudiedAt').toArray();
        const days = new Set(
            (rows as unknown as StoredHafalanProgress[]).map((r) =>
                toDateOnlyKey(new Date(r.lastStudiedAt))
            )
        );

        const today = startOfToday();
        let streak = 0;
        for (;;) {
            const key = toDateOnlyKey(new Date(today.getTime() - streak * 86400000));
            if (!days.has(key)) break;
            streak += 1;
        }
        return streak;
    }

    async function getJuzProgress(juzNumber: number): Promise<JuzProgress> {
        const ayahs = await db.ayahs.where('juz').equals(juzNumber).toArray();
        const pageSet = new Set<number>();
        const pageSurah = new Map<number, number>();
        for (const a of ayahs) {
            pageSet.add(a.page);
            if (!pageSurah.has(a.page)) pageSurah.set(a.page, a.surahId);
        }
        const pages = Array.from(pageSet).sort((a, b) => a - b);

        const progressRows =
            pages.length === 0
                ? []
                : await db.hafalanProgress.where('pageNumber').anyOf(pages).toArray();

        const byPage = new Map<number, StoredHafalanProgress>();
        for (const p of progressRows as unknown as StoredHafalanProgress[]) {
            byPage.set(p.pageNumber, p);
        }

        const pageDetails: JuzProgressPageDetail[] = pages.map((pageNumber) => {
            const p = byPage.get(pageNumber);
            return {
                pageNumber,
                surahId: pageSurah.get(pageNumber) ?? 0,
                isCompleted: p?.isPageCompleted ?? false,
                blocksCompleted: p?.blocksCompleted ?? 0,
                totalBlocks: p?.totalBlocks ?? 4,
                totalReps: p?.totalReps ?? 0,
                lastStudiedAt: p?.lastStudiedAt ? new Date(p.lastStudiedAt) : null,
            };
        });

        const completed = pageDetails.filter((p) => p.isCompleted).length;
        const total = pages.length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;
        const status =
            completed === 0 ? 'not_started' : completed === total ? 'completed' : 'in_progress';

        return {
            juzNumber,
            totalPages: total,
            completedPages: completed,
            percentage,
            status,
            pages: pageDetails,
        };
    }

    async function getTodayReps(): Promise<number> {
        const start = startOfToday();
        const end = endOfToday();
        const rows = await db.tikrarSessions.toArray();
        const list = rows as unknown as StoredTikrarSession[];
        return list.reduce((sum, s) => {
            if (!s.completedAt) return sum;
            const dt = new Date(s.completedAt);
            if (dt >= start && dt <= end) return sum + (s.repetitions ?? 0);
            return sum;
        }, 0);
    }

    return {
        completedPages: computed(() => completedPages.value),
        refreshCompletedPages,
        getOverallProgress,
        getJuzProgress,
        getRecentActivity,
        getStreakDays,
        getTodayReps,
    };
}
