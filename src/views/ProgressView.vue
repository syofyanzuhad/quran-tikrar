<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTransition } from '@vueuse/core';
import { db, type StoredHafalanProgress } from '../db';
import { useProgress, type JuzProgress } from '../composables/useProgress';
import type { HafalanProgress, Surah } from '../types/quran';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';

const router = useRouter();

const isEmptyProgress = computed(
    () =>
        overall.value.completedPages === 0 &&
        recent.value.length === 0 &&
        streakDays.value === 0
);
const {
    getOverallProgress,
    getJuzProgress,
    getRecentActivity,
    getStreakDays,
    getTodayReps,
} = useProgress();

type Overall = { totalPages: number; completedPages: number; percentage: number };

const loading = ref(true);
const overall = ref<Overall>({ totalPages: 604, completedPages: 0, percentage: 0 });
const streakDays = ref(0);
const todayReps = ref(0);
const recent = ref<HafalanProgress[]>([]);
const surahById = ref<Record<number, Surah>>({});

const completedPagesAnimated = useTransition(
    computed(() => overall.value.completedPages),
    { duration: 600 }
);
const percentageAnimated = useTransition(
    computed(() => overall.value.percentage),
    { duration: 600 }
);

type JuzTile = {
    juzNumber: number;
    status: 'not_started' | 'in_progress' | 'completed';
    percentage: number;
};
const juzTiles = ref<JuzTile[]>(
    Array.from({ length: 30 }, (_, i) => ({
        juzNumber: i + 1,
        status: 'not_started',
        percentage: 0,
    }))
);
const selectedJuz = ref<number | null>(null);
const selectedJuzProgress = ref<JuzProgress | null>(null);

type HeatmapCell = {
    dateKey: string;
    date: Date;
    count: number;
};
const heatmap = ref<HeatmapCell[][]>([]);
const maxHeat = computed(() => {
    let max = 0;
    for (const week of heatmap.value) {
        for (const cell of week) max = Math.max(max, cell.count);
    }
    return max;
});

function heatClass(count: number): string {
    if (count <= 0) return 'bg-slate-100';
    if (maxHeat.value <= 1) return 'bg-emerald-300';
    const ratio = count / maxHeat.value;
    if (ratio <= 0.25) return 'bg-emerald-100';
    if (ratio <= 0.5) return 'bg-emerald-200';
    if (ratio <= 0.75) return 'bg-emerald-300';
    return 'bg-emerald-400';
}

function dateOnlyKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function loadSurahs(ids: number[]): Promise<void> {
    const uniq = Array.from(new Set(ids)).filter((id) => id > 0);
    if (uniq.length === 0) return;
    const rows = await Promise.all(uniq.map((id) => db.surahs.get(id)));
    const map: Record<number, Surah> = { ...surahById.value };
    for (const s of rows) {
        if (s) map[s.id] = s;
    }
    surahById.value = map;
}

function goToProgressItem(p: HafalanProgress): void {
    router.push({
        name: 'reader',
        params: { page: String(p.pageNumber) },
    });
}

async function openJuz(juzNumber: number): Promise<void> {
    selectedJuz.value = juzNumber;
    selectedJuzProgress.value = await getJuzProgress(juzNumber);
    await loadSurahs(selectedJuzProgress.value.pages.map((p) => p.surahId));
}

function closeJuz(): void {
    selectedJuz.value = null;
    selectedJuzProgress.value = null;
}

async function buildHeatmap(): Promise<void> {
    const rows = await db.hafalanProgress.toArray();
    const list = rows as unknown as StoredHafalanProgress[];
    const counts = new Map<string, number>();
    for (const r of list) {
        const key = dateOnlyKey(new Date(r.lastStudiedAt));
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 83);
    const weeks: HeatmapCell[][] = [];
    for (let w = 0; w < 12; w++) {
        const week: HeatmapCell[] = [];
        for (let d = 0; d < 7; d++) {
            const idx = w * 7 + d;
            const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx);
            const key = dateOnlyKey(date);
            week.push({ dateKey: key, date, count: counts.get(key) ?? 0 });
        }
        weeks.push(week);
    }
    heatmap.value = weeks;
}

onMounted(async () => {
    loading.value = true;
    try {
        const [o, streak, reps, recentActivity] = await Promise.all([
            getOverallProgress(),
            getStreakDays(),
            getTodayReps(),
            getRecentActivity(5),
        ]);
        overall.value = o;
        streakDays.value = streak;
        todayReps.value = reps;
        recent.value = recentActivity;
        await loadSurahs(recentActivity.map((r) => r.surahId));

        const tiles = await Promise.all(
            Array.from({ length: 30 }, (_, i) => getJuzProgress(i + 1))
        );
        juzTiles.value = tiles.map((t) => ({
            juzNumber: t.juzNumber,
            status: t.status,
            percentage: t.percentage,
        }));

        await buildHeatmap();
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="px-4 pb-24 pt-4">
        <header class="mb-4">
            <h1 class="text-xl font-extrabold tracking-tight text-slate-900">Progress</h1>
            <p class="mt-1 text-sm text-slate-500">Tracking hafalan with Tikrar (offline)</p>
        </header>

        <LoadingSpinner v-if="loading" size="lg" class="mx-auto my-12" />

        <!-- Empty state -->
        <section
            v-if="!loading && isEmptyProgress"
            class="empty-state"
        >
            <div class="empty-illus" aria-hidden="true">📖</div>
            <h2 class="empty-title">Belum ada progress</h2>
            <p class="empty-desc">Buka halaman Quran dan mulai hafal dengan Tikrar.</p>
            <button
                type="button"
                class="empty-cta"
                @click="router.push('/')"
            >
                Mulai hafal
            </button>
        </section>

        <!-- Section 1: Summary -->
        <section
            v-if="!loading && !isEmptyProgress"
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-600">Ringkasan</p>
                    <p class="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                        {{ Math.round(completedPagesAnimated) }} dari 604 Halaman
                    </p>
                    <p class="mt-1 text-sm text-slate-500">
                        {{ percentageAnimated.toFixed(1) }}%
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-semibold text-slate-600">Streak</p>
                    <p class="mt-1 text-lg font-bold tabular-nums text-slate-900">
                        🔥 {{ streakDays }} Hari Berturut-turut
                    </p>
                    <p class="mt-2 text-sm text-slate-500">
                        Total pengulangan hari ini:
                        <span class="font-semibold tabular-nums text-slate-900">{{ todayReps }}</span>
                    </p>
                </div>
            </div>

            <div class="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                    class="h-3 rounded-full bg-emerald-600 transition-[width] duration-700"
                    :style="{ width: `${Math.min(100, Math.max(0, overall.percentage))}%` }"
                />
            </div>
        </section>

        <template v-if="!loading && !isEmptyProgress">
        <!-- Section 2: Juz grid -->
        <section class="mt-6">
            <div class="mb-2 flex items-end justify-between gap-3">
                <h2 class="text-sm font-semibold tracking-wide text-slate-600 uppercase">
                    Progress per Juz
                </h2>
                <p class="text-xs text-slate-500">Tap untuk detail</p>
            </div>

            <div class="grid grid-cols-6 gap-2">
                <button
                    v-for="tile in juzTiles"
                    :key="tile.juzNumber"
                    type="button"
                    class="relative aspect-square rounded-lg border border-slate-200 text-sm font-bold text-slate-900 shadow-sm transition active:scale-[0.98]"
                    :class="[
                        tile.status === 'completed'
                            ? 'bg-emerald-200'
                            : tile.status === 'in_progress'
                              ? 'bg-yellow-100'
                              : 'bg-slate-100',
                    ]"
                    @click="openJuz(tile.juzNumber)"
                >
                    <span class="absolute left-2 top-2 text-xs font-semibold text-slate-600">
                        {{ tile.juzNumber }}
                    </span>
                    <span class="sr-only">Juz {{ tile.juzNumber }}</span>
                    <span class="absolute bottom-2 right-2 text-[10px] font-semibold text-slate-600">
                        {{ tile.percentage.toFixed(0) }}%
                    </span>
                </button>
            </div>
        </section>

        <!-- Section 3: Recent pages -->
        <section class="mt-6">
            <div class="mb-2 flex items-end justify-between gap-3">
                <h2 class="text-sm font-semibold tracking-wide text-slate-600 uppercase">
                    Halaman Terakhir Dipelajari
                </h2>
                <p class="text-xs text-slate-500">5 terakhir</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div v-if="recent.length === 0" class="p-4 text-sm text-slate-500">
                    Belum ada aktivitas.
                </div>
                <ul v-else class="divide-y divide-slate-200">
                    <li v-for="p in recent" :key="p.id" class="flex items-center justify-between gap-3 p-4">
                        <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-slate-900">
                                Page {{ p.pageNumber }} · {{ surahById[p.surahId]?.nameSimple ?? `Surah ${p.surahId}` }}
                            </p>
                            <p class="mt-1 text-xs text-slate-500">
                                {{ new Date(p.lastStudiedAt).toLocaleString() }} · reps:
                                <span class="font-semibold tabular-nums text-slate-700">{{ p.totalReps }}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            class="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
                            @click="goToProgressItem(p)"
                        >
                            Lanjut
                        </button>
                    </li>
                </ul>
            </div>
        </section>

        <!-- Section 4: Heatmap -->
        <section class="mt-6">
            <div class="mb-2 flex items-end justify-between gap-3">
                <h2 class="text-sm font-semibold tracking-wide text-slate-600 uppercase">
                    Kalender Aktivitas
                </h2>
                <p class="text-xs text-slate-500">84 hari terakhir</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div class="grid grid-cols-7 gap-2">
                    <template v-for="(week, w) in heatmap" :key="w">
                        <div
                            v-for="cell in week"
                            :key="cell.dateKey"
                            class="h-4 w-4 rounded-sm transition-colors"
                            :class="heatClass(cell.count)"
                            :title="`${cell.date.toDateString()}: ${cell.count} halaman`"
                        />
                    </template>
                </div>
                <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Less</span>
                    <div class="flex items-center gap-1">
                        <span class="h-3 w-3 rounded-sm bg-slate-100" />
                        <span class="h-3 w-3 rounded-sm bg-emerald-100" />
                        <span class="h-3 w-3 rounded-sm bg-emerald-200" />
                        <span class="h-3 w-3 rounded-sm bg-emerald-300" />
                        <span class="h-3 w-3 rounded-sm bg-emerald-400" />
                    </div>
                    <span>More</span>
                </div>
            </div>
        </section>

        <!-- Juz detail drawer -->
        <div
            v-if="selectedJuz != null && selectedJuzProgress"
            class="fixed inset-0 z-50 flex items-end bg-black/40 p-3"
            @click.self="closeJuz"
        >
            <div class="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-sm font-semibold text-slate-600">Juz {{ selectedJuz }}</p>
                        <p class="mt-1 text-lg font-bold tabular-nums text-slate-900">
                            {{ selectedJuzProgress.completedPages }} / {{ selectedJuzProgress.totalPages }} halaman
                            ({{ selectedJuzProgress.percentage.toFixed(1) }}%)
                        </p>
                    </div>
                    <button
                        type="button"
                        class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                        @click="closeJuz"
                    >
                        Tutup
                    </button>
                </div>

                <div class="mt-4 max-h-[55vh] overflow-auto rounded-xl border border-slate-200">
                    <ul class="divide-y divide-slate-200">
                        <li
                            v-for="p in selectedJuzProgress.pages"
                            :key="p.pageNumber"
                            class="flex items-center justify-between gap-3 p-3"
                        >
                            <div class="min-w-0">
                                <p class="truncate text-sm font-semibold text-slate-900">
                                    Page {{ p.pageNumber }} · {{ surahById[p.surahId]?.nameSimple ?? `Surah ${p.surahId}` }}
                                </p>
                                <p class="mt-1 text-xs text-slate-500">
                                    {{ p.isCompleted ? 'Selesai' : p.blocksCompleted > 0 ? 'Sedang' : 'Belum' }}
                                    · reps: <span class="font-semibold tabular-nums">{{ p.totalReps }}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                class="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                                @click="router.push({ name: 'reader', params: { page: String(p.pageNumber) } })"
                            >
                                Lanjut
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        </template>
    </div>
</template>

<style scoped>
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
}
.empty-illus {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.9;
}
.empty-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.5rem 0;
}
.empty-desc {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 1.5rem 0;
    max-width: 20rem;
}
.empty-cta {
    min-width: 44px;
    min-height: 44px;
    padding: 0.75rem 1.5rem;
    border-radius: 1rem;
    background: #1a7a4a;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}
.empty-cta:hover {
    box-shadow: 0 4px 12px rgba(26, 122, 74, 0.35);
}
.empty-cta:active {
    transform: scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
    .empty-cta {
        transition: none;
    }
}
</style>
