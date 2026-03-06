import { computed, ref, watch, type Ref } from 'vue';
import mitt, { type Emitter } from 'mitt';
import { db, type StoredTikrarSession } from '../db';
import type { Ayah, HafalanProgress, TikrarBlock } from '../types/quran';

export type TikrarMode = 'single' | 'cumulative';

export type TikrarEvents = {
    'block-complete': {
        pageNumber: number;
        blockId: string;
        blockIndex: number | null;
        repetitions: number;
        targetReps: number;
        mode: TikrarMode;
        isPageComplete: boolean;
    };
    'page-complete': {
        pageNumber: number;
        blockIds: string[];
        totalReps: number;
        targetReps: number;
        mode: TikrarMode;
    };
};

const TOTAL_BLOCKS = 4;
const DEFAULT_TARGET_REPS = 20;

function pageBlockId(pageNumber: number, blockIndex: number): string {
    return `page-${pageNumber}-block-${blockIndex}`;
}

function combinedBlockId(pageNumber: number): string {
    return `page-${pageNumber}-combined`;
}

function clampToPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}

function nowIso(): string {
    return new Date().toISOString();
}

async function getPageSurahId(pageNumber: number): Promise<number> {
    const ayahs = await db.getPageAyahs(pageNumber);
    const first = ayahs[0];
    return first?.surahId ?? 0;
}

function sumReps(reps: Record<string, number>): number {
    return Object.values(reps).reduce((acc, n) => acc + n, 0);
}

function buildStoredSession(params: {
    sessionId: string;
    blockId: string;
    repetitions: number;
    isCompleted: boolean;
    completedAt: string | null;
}): StoredTikrarSession {
    return {
        id: params.sessionId,
        blockId: params.blockId,
        repetitions: params.repetitions,
        completedAt: params.completedAt,
        isCompleted: params.isCompleted,
    };
}

export type UseTikrarReturn = {
    currentPage: Ref<number>;
    currentBlockIndex: Ref<number>;
    sessionReps: Ref<Record<string, number>>;
    targetReps: Ref<number>;
    mode: Ref<TikrarMode>;

    startSession: (pageNumber: number) => void;
    incrementRep: (blockId: string) => void;
    resetBlock: (blockId: string) => void;
    isBlockComplete: (blockId: string) => boolean;
    isPageComplete: () => boolean;
    nextBlock: () => void;
    getBlockProgress: (blockId: string) => number;

    combinedId: Ref<string>;
    isCombinedAvailable: Ref<boolean>;
    emitter: Emitter<TikrarEvents>;
};

/**
 * Manage tikrar sessions (repetitions) per page using 4 color blocks.
 * Persists completed block sessions to IndexedDB and updates hafalan progress.
 */
export function useTikrar(): UseTikrarReturn {
    const currentPage = ref<number>(1);
    const currentBlockIndex = ref<number>(0);
    const sessionReps = ref<Record<string, number>>({});
    const targetReps = ref<number>(DEFAULT_TARGET_REPS);
    const mode = ref<TikrarMode>('single');

    // Persist active reps dynamically to DB
    let isHydrating = true;
    db.meta.get('tikrar-in-progress').then((saved) => {
        if (saved?.value) {
            sessionReps.value = saved.value;
        }
        isHydrating = false;
    });

    watch(sessionReps, async (newReps) => {
        if (isHydrating) return;
        
        // Remove completed blocks from the cache so it doesn't grow infinitely large
        const activeReps = { ...newReps };
        Object.keys(activeReps).forEach(key => {
            const currentRep = activeReps[key];
            if (currentRep !== undefined && currentRep >= targetReps.value) {
                delete activeReps[key];
            }
        });

        await db.meta.put({ key: 'tikrar-in-progress', value: activeReps });
    }, { deep: true });

    const emitter: Emitter<TikrarEvents> = mitt<TikrarEvents>();

    const blocks = ref<TikrarBlock[]>([]);
    const pageAyahs = ref<Ayah[]>([]);

    const combinedId = computed(() => combinedBlockId(currentPage.value));

    const pageBlockIds = computed(() => {
        if (blocks.value.length === TOTAL_BLOCKS) return blocks.value.map((b) => b.id);
        return Array.from({ length: TOTAL_BLOCKS }, (_, i) => pageBlockId(currentPage.value, i));
    });

    const isCombinedAvailable = computed(() => {
        return mode.value === 'cumulative' && isPageComplete();
    });

    function isBlockComplete(blockId: string): boolean {
        return (sessionReps.value[blockId] ?? 0) >= targetReps.value;
    }

    function isPageComplete(): boolean {
        const ids = pageBlockIds.value;
        return ids.every((id) => isBlockComplete(id));
    }

    function getBlockProgress(blockId: string): number {
        const reps = sessionReps.value[blockId] ?? 0;
        const pct = targetReps.value <= 0 ? 100 : (reps / targetReps.value) * 100;
        return clampToPercent(Math.round(pct));
    }

    function resetBlock(blockId: string): void {
        const next = { ...sessionReps.value };
        delete next[blockId];
        sessionReps.value = next;
    }

    async function ensurePageLoaded(pageNumber: number): Promise<void> {
        const [loadedBlocks, loadedAyahs] = await Promise.all([
            db.getPageBlocks(pageNumber),
            db.getPageAyahs(pageNumber),
        ]);
        blocks.value = loadedBlocks;
        pageAyahs.value = loadedAyahs;
    }

    async function upsertHafalanProgress(): Promise<void> {
        const pageNumber = currentPage.value;
        const surahId = pageAyahs.value[0]?.surahId ?? (await getPageSurahId(pageNumber));
        const completed = pageBlockIds.value.reduce(
            (sum, id) => sum + ((sessionReps.value[id] ?? 0) >= targetReps.value ? 1 : 0),
            0
        );
        const total = sumReps(sessionReps.value);

        const progress: HafalanProgress = {
            id: `page-${pageNumber}`,
            pageNumber,
            surahId,
            blocksCompleted: completed,
            totalBlocks: TOTAL_BLOCKS,
            isPageCompleted: isPageComplete(),
            lastStudiedAt: new Date(),
            totalReps: total,
        };

        await db.upsertProgress(progress);
    }

    function resolveBlockIndex(blockId: string): number | null {
        const match = /block-(\d+)$/.exec(blockId);
        if (!match) return null;
        const idx = Number.parseInt(match[1] ?? '', 10);
        return Number.isFinite(idx) ? idx : null;
    }

    async function persistCompletedSession(blockId: string): Promise<void> {
        const repetitions = sessionReps.value[blockId] ?? 0;
        const completedAt = nowIso();
        const sessionId = `${blockId}-${completedAt}`;

        const stored = buildStoredSession({
            sessionId,
            blockId,
            repetitions,
            isCompleted: true,
            completedAt,
        });

        await db.tikrarSessions.put(stored);
    }

    function nextBlock(): void {
        const pageNumber = currentPage.value;
        const currentId = pageBlockId(pageNumber, currentBlockIndex.value);
        if (!isBlockComplete(currentId)) return;

        if (currentBlockIndex.value < TOTAL_BLOCKS - 1) {
            currentBlockIndex.value += 1;
        }
        // After the last block completes, UI can switch to combined session (cumulative mode).
    }

    function startSession(pageNumber: number): void {
        currentPage.value = pageNumber;
        currentBlockIndex.value = 0;
        // Don't wipe sessionReps here, otherwise navigating naturally deletes cache
        void ensurePageLoaded(pageNumber);
        void upsertHafalanProgress();
    }

    function incrementRep(blockId: string): void {
        const wasPageComplete = isPageComplete();
        const prev = sessionReps.value[blockId] ?? 0;
        const next = prev + 1;
        sessionReps.value = { ...sessionReps.value, [blockId]: next };

        const crossedCompletion = prev < targetReps.value && next >= targetReps.value;
        if (!crossedCompletion) return;

        const blockIndex = resolveBlockIndex(blockId);
        void (async () => {
            await persistCompletedSession(blockId);
            await upsertHafalanProgress();

            const isNowPageComplete = isPageComplete();
            emitter.emit('block-complete', {
                pageNumber: currentPage.value,
                blockId,
                blockIndex,
                repetitions: next,
                targetReps: targetReps.value,
                mode: mode.value,
                isPageComplete: isNowPageComplete,
            });

            const isPageBlock = pageBlockIds.value.includes(blockId);
            if (isPageBlock && !wasPageComplete && isNowPageComplete) {
                emitter.emit('page-complete', {
                    pageNumber: currentPage.value,
                    blockIds: pageBlockIds.value,
                    totalReps: sumReps(sessionReps.value),
                    targetReps: targetReps.value,
                    mode: mode.value,
                });

                if (mode.value === 'cumulative') {
                    const id = combinedId.value;
                    if (sessionReps.value[id] === undefined) {
                        sessionReps.value = { ...sessionReps.value, [id]: 0 };
                    }
                }
            }
        })();
    }

    return {
        currentPage,
        currentBlockIndex,
        sessionReps,
        targetReps,
        mode,

        startSession,
        incrementRep,
        resetBlock,
        isBlockComplete,
        isPageComplete,
        nextBlock,
        getBlockProgress,

        combinedId,
        isCombinedAvailable,
        emitter,
    };
}

// ---- Optional legacy per-ayah counter (localStorage) ----

interface AyahTikrarCount {
    ayahKey: string;
    count: number;
    lastAt: string;
}

const AYAH_STORAGE_KEY = 'quran-tikrar-ayah-counts';

function ayahKey(surahId: number, verseNumber: number): string {
    return `${surahId}-${verseNumber}`;
}

function loadAyahCounts(): Record<string, AyahTikrarCount> {
    try {
        const raw = localStorage.getItem(AYAH_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, AyahTikrarCount>) : {};
    } catch {
        return {};
    }
}

function saveAyahCounts(counts: Record<string, AyahTikrarCount>): void {
    localStorage.setItem(AYAH_STORAGE_KEY, JSON.stringify(counts));
}

/**
 * Legacy tikrar counter per ayah, stored in localStorage.
 * This is independent from page/block sessions stored in IndexedDB.
 */
export function useAyahTikrar() {
    const counts = ref<Record<string, AyahTikrarCount>>(loadAyahCounts());

    function getCount(surahId: number, verseNumber: number): number {
        const key = ayahKey(surahId, verseNumber);
        return counts.value[key]?.count ?? 0;
    }

    function increment(surahId: number, verseNumber: number): void {
        const key = ayahKey(surahId, verseNumber);
        const current = counts.value[key];
        const next: AyahTikrarCount = {
            ayahKey: key,
            count: (current?.count ?? 0) + 1,
            lastAt: nowIso(),
        };
        counts.value = { ...counts.value, [key]: next };
        saveAyahCounts(counts.value);
    }

    function reset(surahId: number, verseNumber: number): void {
        const key = ayahKey(surahId, verseNumber);
        const next = { ...counts.value };
        delete next[key];
        counts.value = next;
        saveAyahCounts(counts.value);
    }

    function resetAll(): void {
        counts.value = {};
        saveAyahCounts(counts.value);
    }

    const totalTikrarCount = computed(() => {
        return Object.values(counts.value).reduce((sum, s) => sum + s.count, 0);
    });

    return {
        counts: computed(() => counts.value),
        getCount,
        increment,
        reset,
        resetAll,
        totalTikrarCount,
    };
}
