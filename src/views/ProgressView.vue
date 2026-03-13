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
    if (count <= 0) return 'heat-0';
    if (maxHeat.value <= 1) return 'heat-3';
    const ratio = count / maxHeat.value;
    if (ratio <= 0.25) return 'heat-1';
    if (ratio <= 0.5) return 'heat-2';
    if (ratio <= 0.75) return 'heat-3';
    return 'heat-4';
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
    <div class="progress-view">
        <header class="progress-header">
            <h1 class="progress-title">Progress</h1>
            <p class="progress-subtitle">Tracking hafalan with Tikrar (offline)</p>
        </header>

        <LoadingSpinner v-if="loading" size="lg" class="progress-spinner" />

        <section v-if="!loading && isEmptyProgress" class="empty-state">
            <div class="empty-illus" aria-hidden="true">📖</div>
            <h2 class="empty-title">Belum ada progress</h2>
            <p class="empty-desc">Buka halaman Quran dan mulai hafal dengan Tikrar.</p>
            <button type="button" class="empty-cta" @click="router.push('/')">
                Mulai hafal
            </button>
        </section>

        <section v-if="!loading && !isEmptyProgress" class="summary-card">
            <div class="summary-row">
                <div class="summary-main">
                    <p class="summary-label">Ringkasan</p>
                    <p class="summary-value">
                        {{ Math.round(completedPagesAnimated) }} dari 604 Halaman
                    </p>
                    <p class="summary-percent">{{ percentageAnimated.toFixed(1) }}%</p>
                </div>
                <div class="summary-side">
                    <p class="summary-label">Streak</p>
                    <p class="summary-streak">🔥 {{ streakDays }} Hari Berturut-turut</p>
                    <p class="summary-reps">
                        Total pengulangan hari ini:
                        <span class="summary-reps__value">{{ todayReps }}</span>
                    </p>
                </div>
            </div>

            <div class="summary-bar">
                <div
                    class="summary-bar__fill"
                    :style="{ width: `${Math.min(100, Math.max(0, overall.percentage))}%` }"
                />
            </div>
        </section>

        <template v-if="!loading && !isEmptyProgress">
            <section class="progress-section">
                <div class="section-header">
                    <h2 class="section-title">Progress per Juz</h2>
                    <p class="section-note">Tap untuk detail</p>
                </div>

                <div class="juz-grid">
                    <button
                        v-for="tile in juzTiles"
                        :key="tile.juzNumber"
                        type="button"
                        class="juz-tile"
                        :class="{
                          'juz-tile--done': tile.status === 'completed',
                          'juz-tile--progress': tile.status === 'in_progress'
                        }"
                        @click="openJuz(tile.juzNumber)"
                    >
                        <span class="juz-tile__num">{{ tile.juzNumber }}</span>
                        <span class="sr-only">Juz {{ tile.juzNumber }}</span>
                        <span class="juz-tile__percent">{{ tile.percentage.toFixed(0) }}%</span>
                    </button>
                </div>
            </section>

            <section class="progress-section">
                <div class="section-header">
                    <h2 class="section-title">Halaman Terakhir Dipelajari</h2>
                    <p class="section-note">5 terakhir</p>
                </div>

                <div class="recent-card">
                    <div v-if="recent.length === 0" class="recent-empty">
                        Belum ada aktivitas.
                    </div>
                    <ul v-else class="recent-list">
                        <li v-for="p in recent" :key="p.id" class="recent-item">
                            <div class="recent-info">
                                <p class="recent-title">
                                    Page {{ p.pageNumber }} · {{ surahById[p.surahId]?.nameSimple ?? `Surah ${p.surahId}` }}
                                </p>
                                <p class="recent-meta">
                                    {{ new Date(p.lastStudiedAt).toLocaleString() }} · reps:
                                    <span class="recent-reps">{{ p.totalReps }}</span>
                                </p>
                            </div>
                            <button type="button" class="recent-btn" @click="goToProgressItem(p)">
                                Lanjut
                            </button>
                        </li>
                    </ul>
                </div>
            </section>

            <section class="progress-section">
                <div class="section-header">
                    <h2 class="section-title">Kalender Aktivitas</h2>
                    <p class="section-note">84 hari terakhir</p>
                </div>

                <div class="heatmap-card">
                    <div class="heatmap-grid">
                        <template v-for="(week, w) in heatmap" :key="w">
                            <div
                                v-for="cell in week"
                                :key="cell.dateKey"
                                class="heatmap-cell"
                                :class="heatClass(cell.count)"
                                :title="`${cell.date.toDateString()}: ${cell.count} halaman`"
                            />
                        </template>
                    </div>
                    <div class="heatmap-legend">
                        <span>Less</span>
                        <div class="heatmap-legend__scale">
                            <span class="heatmap-legend__cell heat-0" />
                            <span class="heatmap-legend__cell heat-1" />
                            <span class="heatmap-legend__cell heat-2" />
                            <span class="heatmap-legend__cell heat-3" />
                            <span class="heatmap-legend__cell heat-4" />
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </section>

            <div
                v-if="selectedJuz != null && selectedJuzProgress"
                class="juz-drawer"
                @click.self="closeJuz"
            >
                <div class="juz-drawer__card">
                    <div class="juz-drawer__header">
                        <div>
                            <p class="juz-drawer__label">Juz {{ selectedJuz }}</p>
                            <p class="juz-drawer__title">
                                {{ selectedJuzProgress.completedPages }} / {{ selectedJuzProgress.totalPages }} halaman
                                ({{ selectedJuzProgress.percentage.toFixed(1) }}%)
                            </p>
                        </div>
                        <button type="button" class="juz-drawer__close" @click="closeJuz">
                            Tutup
                        </button>
                    </div>

                    <div class="juz-drawer__list">
                        <ul class="recent-list">
                            <li
                                v-for="p in selectedJuzProgress.pages"
                                :key="p.pageNumber"
                                class="recent-item"
                            >
                                <div class="recent-info">
                                    <p class="recent-title">
                                        Page {{ p.pageNumber }} · {{ surahById[p.surahId]?.nameSimple ?? `Surah ${p.surahId}` }}
                                    </p>
                                    <p class="recent-meta">
                                        {{ p.isCompleted ? 'Selesai' : p.blocksCompleted > 0 ? 'Sedang' : 'Belum' }}
                                        · reps: <span class="recent-reps">{{ p.totalReps }}</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    class="recent-btn"
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
.progress-view {
    padding: 1rem;
    padding-bottom: 6rem;
}

.progress-header {
    margin-bottom: 1rem;
}

.progress-title {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin: 0;
}

.progress-subtitle {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #64748b;
}

.progress-spinner {
    display: block;
    margin: 3rem auto;
}

.summary-card {
    border-radius: 1rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.summary-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.summary-main {
    min-width: 0;
}

.summary-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #64748b;
}

.summary-value {
    margin: 0.35rem 0 0.2rem;
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
}

.summary-percent {
    margin: 0;
    font-size: 0.85rem;
    color: #94a3b8;
}

.summary-side {
    text-align: right;
}

.summary-streak {
    margin: 0.35rem 0 0;
    font-weight: 700;
    color: #0f172a;
}

.summary-reps {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #64748b;
}

.summary-reps__value {
    font-weight: 700;
    color: #0f172a;
}

.summary-bar {
    margin-top: 1rem;
    height: 10px;
    width: 100%;
    border-radius: 999px;
    background: #f1f5f9;
    overflow: hidden;
}

.summary-bar__fill {
    height: 100%;
    border-radius: 999px;
    background: #059669;
    transition: width 0.7s ease;
}

.progress-section {
    margin-top: 1.5rem;
}

.section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
}

.section-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin: 0;
}

.section-note {
    font-size: 0.7rem;
    color: #94a3b8;
    margin: 0;
}

.juz-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.5rem;
}

.juz-tile {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-weight: 700;
    color: #0f172a;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    transition: transform 0.15s ease;
}

.juz-tile:active {
    transform: scale(0.97);
}

.juz-tile--done {
    background: #bbf7d0;
}

.juz-tile--progress {
    background: #fef9c3;
}

.juz-tile__num {
    position: absolute;
    top: 8px;
    left: 10px;
    font-size: 0.7rem;
    color: #64748b;
}

.juz-tile__percent {
    position: absolute;
    bottom: 8px;
    right: 10px;
    font-size: 0.65rem;
    color: #64748b;
}

.recent-card {
    border-radius: 1rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.recent-empty {
    padding: 1rem;
    font-size: 0.85rem;
    color: #94a3b8;
}

.recent-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.recent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    border-top: 1px solid #e2e8f0;
}

.recent-item:first-child {
    border-top: none;
}

.recent-info {
    min-width: 0;
}

.recent-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
}

.recent-meta {
    margin-top: 0.3rem;
    font-size: 0.75rem;
    color: #94a3b8;
}

.recent-reps {
    font-weight: 700;
    color: #64748b;
}

.recent-btn {
    border: none;
    border-radius: 0.6rem;
    background: #0f172a;
    color: #fff;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease;
}

.recent-btn:active {
    transform: scale(0.98);
}

.heatmap-card {
    border-radius: 1rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.heatmap-grid {
    display: grid;
    grid-template-columns: repeat(7, 16px);
    gap: 0.5rem;
}

.heatmap-cell {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
}

.heatmap-legend {
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.7rem;
    color: #94a3b8;
}

.heatmap-legend__scale {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.heatmap-legend__cell {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    display: inline-block;
}

.heat-0 { background: #f1f5f9; }
.heat-1 { background: #d1fae5; }
.heat-2 { background: #a7f3d0; }
.heat-3 { background: #6ee7b7; }
.heat-4 { background: #34d399; }

.juz-drawer {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-end;
    padding: 0.75rem;
    z-index: 100;
}

.juz-drawer__card {
    width: 100%;
    max-width: 640px;
    background: #fff;
    border-radius: 1rem;
    padding: 1rem;
    margin: 0 auto;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
}

.juz-drawer__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}

.juz-drawer__label {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: #64748b;
}

.juz-drawer__title {
    margin: 0.35rem 0 0;
    font-weight: 800;
    color: #0f172a;
}

.juz-drawer__close {
    border: none;
    border-radius: 0.6rem;
    padding: 0.45rem 0.8rem;
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
    cursor: pointer;
}

.juz-drawer__list {
    margin-top: 1rem;
    max-height: 55vh;
    overflow: auto;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
}

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

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
}

@media (prefers-reduced-motion: reduce) {
    .summary-bar__fill,
    .heatmap-cell,
    .juz-tile,
    .recent-btn,
    .empty-cta {
        transition: none;
    }
}
</style>
