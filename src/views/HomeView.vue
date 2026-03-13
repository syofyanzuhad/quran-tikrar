<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuran } from '../composables/useQuran';
import { useProgress } from '../composables/useProgress';
import type { Surah } from '../types/quran';
import { JUZ_SURAH_RANGES } from '../constants/juz';
import { LAST_PAGE_KEY } from '../constants/storage';

const router = useRouter();
const { getSurahList, getFirstPageOfSurah, getPagesInSurah } = useQuran();
const { getJuzProgress, refreshCompletedPages, completedPages } = useProgress();

const activeTab = ref<'surah' | 'juz' | 'continue'>('surah');
const surahs = ref<Surah[]>([]);
const surahFirstPages = ref<Record<number, number>>({});
const surahPageProgress = ref<Record<number, { completed: number; total: number }>>({});
const searchQuery = ref('');
const loading = ref(true);
const juzProgressList = ref<{
    juzNumber: number;
    percentage: number;
    status: string;
    surahRange: string;
    firstPage: number;
}[]>([]);
const lastPage = ref<number | null>(null);

const filteredSurahs = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return surahs.value;
    return surahs.value.filter((s) => {
        return (
            s.nameSimple.toLowerCase().includes(q) ||
            s.nameArabic.includes(q) ||
            s.nameTranslation?.toLowerCase().includes(q) ||
            String(s.id).includes(q)
        );
    });
});

function openPage(page: number): void {
    router.push({ name: 'reader', params: { page: String(page) } });
}

async function openSurah(surahId: number): Promise<void> {
    const page = surahFirstPages.value[surahId] ?? (await getFirstPageOfSurah(surahId));
    surahFirstPages.value = { ...surahFirstPages.value, [surahId]: page };
    openPage(page);
}

function getSurahProgress(surahId: number): number {
    const p = surahPageProgress.value[surahId];
    if (!p || p.total === 0) return 0;
    return Math.round((p.completed / p.total) * 1000) / 10;
}

function getLastPageFromStorage(): number | null {
    try {
        const raw = localStorage.getItem(LAST_PAGE_KEY);
        const n = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(n) && n >= 1 && n <= 604 ? n : null;
    } catch {
        return null;
    }
}

onMounted(async () => {
    loading.value = true;
    try {
        surahs.value = await getSurahList();
        await refreshCompletedPages();
        const completedSet = new Set(completedPages.value);

        for (const s of surahs.value) {
            const pages = await getPagesInSurah(s.id);
            const fp = pages[0];
            if (fp != null) surahFirstPages.value = { ...surahFirstPages.value, [s.id]: fp };
            const completed = pages.filter((p) => completedSet.has(p)).length;
            surahPageProgress.value = {
                ...surahPageProgress.value,
                [s.id]: { completed, total: pages.length },
            };
        }

        const juzList = await Promise.all(
            JUZ_SURAH_RANGES.map(async (_, i) => {
                const juzNum = i + 1;
                const progress = await getJuzProgress(juzNum);
                const [start, end] = JUZ_SURAH_RANGES[i] ?? [1, 1];
                const surahRange = start === end ? `Surah ${start}` : `Surah ${start}–${end}`;
                const firstPage = progress.pages[0]?.pageNumber ?? 1;
                return {
                    juzNumber: juzNum,
                    percentage: progress.percentage,
                    status: progress.status,
                    surahRange,
                    firstPage,
                };
            })
        );
        juzProgressList.value = juzList;
        lastPage.value = getLastPageFromStorage();
    } finally {
        loading.value = false;
    }
});

watch(activeTab, (tab) => {
    if (tab === 'continue') lastPage.value = getLastPageFromStorage();
});
</script>

<template>
    <div class="home-view">
        <header class="home-header">
            <h1 class="home-title">Quran Tikrar</h1>
            <p class="home-subtitle">Baca dan hafal per halaman</p>
        </header>

        <div class="home-tabs">
            <button
                type="button"
                class="tab"
                :class="{ active: activeTab === 'surah' }"
                @click="activeTab = 'surah'"
            >
                Per Surah
            </button>
            <button
                type="button"
                class="tab"
                :class="{ active: activeTab === 'juz' }"
                @click="activeTab = 'juz'"
            >
                Per Juz
            </button>
            <button
                type="button"
                class="tab"
                :class="{ active: activeTab === 'continue' }"
                @click="activeTab = 'continue'"
            >
                Lanjutkan
            </button>
        </div>

        <template v-if="loading">
            <section class="home-skeleton">
                <div class="skeleton-input" />
                <ul class="surah-list">
                    <li v-for="i in 8" :key="i" class="surah-card skeleton-card">
                        <div class="surah-row">
                            <span class="skeleton-num" />
                            <div class="skeleton-content">
                                <div class="surah-header">
                                    <div class="skeleton-line skeleton-title" />
                                    <div class="skeleton-line skeleton-arabic" />
                                </div>
                                <div class="skeleton-line skeleton-meta" />
                                <div class="skeleton-progress" />
                            </div>
                        </div>
                    </li>
                </ul>
            </section>
        </template>

        <template v-else>
            <section v-show="activeTab === 'surah'" class="surah-section">
                <div class="search-wrap">
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="Cari surah (Arab atau Latin)..."
                        class="search-input"
                    />
                </div>
                <ul class="surah-list">
                    <li v-for="surah in filteredSurahs" :key="surah.id">
                        <button
                            type="button"
                            class="surah-card"
                            @click="openSurah(surah.id)"
                        >
                            <div class="surah-row">
                                <span class="num">{{ surah.id }}</span>
                                <div class="surah-info">
                                    <div class="surah-header">
                                        <p class="surah-name">{{ surah.nameSimple }}</p>
                                        <p class="arabic surah-arabic" dir="rtl">
                                            {{ surah.nameArabic }}
                                        </p>
                                    </div>
                                    <p class="surah-meta">
                                        {{ surah.revelationPlace === 'makkah' ? 'Makkiyah' : 'Madaniyah' }} • {{ surah.versesCount }} ayat
                                    </p>
                                    <div class="surah-progress">
                                        <div
                                            class="surah-progress__fill"
                                            :style="{ width: `${getSurahProgress(surah.id)}%` }"
                                        />
                                    </div>
                                </div>
                            </div>
                        </button>
                    </li>
                </ul>
            </section>

            <section v-show="activeTab === 'juz'" class="juz-grid">
                <button
                    v-for="item in juzProgressList"
                    :key="item.juzNumber"
                    type="button"
                    class="juz-card"
                    :class="{ completed: item.status === 'completed' }"
                    @click="openPage(item.firstPage)"
                >
                    <p class="juz-title">Juz {{ item.juzNumber }}</p>
                    <p class="juz-range">{{ item.surahRange }}</p>
                    <p class="juz-percent">{{ item.percentage.toFixed(0) }}%</p>
                </button>
            </section>

            <section v-show="activeTab === 'continue'" class="continue-section">
                <template v-if="lastPage != null">
                    <p class="continue-label">Halaman terakhir yang dibuka</p>
                    <button
                        type="button"
                        class="continue-btn"
                        @click="openPage(lastPage)"
                    >
                        ▶ Lanjutkan Halaman {{ lastPage }}
                    </button>
                </template>
                <template v-else>
                    <p class="continue-empty">Belum ada halaman terakhir.</p>
                    <p class="continue-hint">
                        Pilih surah atau juz di tab lain, lalu buka halaman untuk mulai menghafal.
                    </p>
                </template>
            </section>
        </template>
    </div>
</template>

<style scoped>
.home-view {
    padding: 1rem;
    padding-bottom: 5rem;
}

.home-header {
    margin-bottom: 1rem;
}

.home-title {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin: 0;
}

.home-subtitle {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--text-muted, #64748b);
}

.home-tabs {
    display: flex;
    gap: 0.5rem;
    background: #f1f5f9;
    border-radius: 0.9rem;
    padding: 0.25rem;
    margin-bottom: 1rem;
}

.tab {
    flex: 1;
    border-radius: 0.75rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
}

.tab.active {
    background: white;
    color: #0f172a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.home-skeleton {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.search-wrap {
    position: relative;
}

.search-input {
    width: 100%;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0.65rem 2.5rem 0.65rem 1rem;
    font-size: 0.875rem;
}

.surah-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.surah-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.surah-card {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border-radius: 0.75rem;
    border: 1px solid var(--border, #e2e8f0);
    background: var(--surface, #ffffff);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    cursor: pointer;
    text-align: left;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.surah-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-color: #cbd5e1;
}

.surah-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.surah-info {
    min-width: 0;
    flex: 1;
    text-align: left;
}

.surah-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.surah-name {
    font-weight: 600;
    margin: 0;
    color: #0f172a;
}

.surah-arabic {
    font-size: 1.15rem;
    font-weight: 500;
    color: #047857;
    margin: 0;
}

.surah-meta {
    margin-top: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
}

.surah-progress {
    margin-top: 0.35rem;
    height: 4px;
    width: 100%;
    border-radius: 999px;
    background: rgba(226, 232, 240, 0.7);
    overflow: hidden;
}

.surah-progress__fill {
    height: 100%;
    border-radius: 999px;
    background: #10b981;
    transition: width 0.3s ease;
}

.num {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.8125rem;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.25);
}

.arabic {
    font-family: 'Amiri', 'Uthmanic Hafs', 'Scheherazade New', serif;
}

.juz-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
}

.juz-card {
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--border, #e2e8f0);
    background: var(--surface, #ffffff);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    text-align: left;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.juz-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e1;
}

.juz-card.completed {
    background: #dcfce7;
    border-color: #86efac;
}

.juz-title {
    font-weight: 700;
    margin: 0;
}

.juz-range {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #64748b;
}

.juz-percent {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1a7a4a;
}

.continue-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 0;
    text-align: center;
}

.continue-label {
    font-size: 0.875rem;
    color: #64748b;
}

.continue-empty {
    font-size: 0.875rem;
    color: #64748b;
}

.continue-hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #94a3b8;
}

.continue-btn {
    margin-top: 1rem;
    padding: 1rem 1.5rem;
    border-radius: 1rem;
    background: #1a7a4a;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}

.continue-btn:hover {
    box-shadow: 0 4px 12px rgba(26, 122, 74, 0.35);
}

.continue-btn:active {
    transform: scale(0.98);
}

/* Skeleton loader */
.skeleton-input {
    height: 2.75rem;
    border-radius: 0.75rem;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

.skeleton-card {
    pointer-events: none;
}

.skeleton-card .skeleton-num,
.skeleton-line,
.skeleton-progress {
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.2s ease-in-out infinite;
    border-radius: 0.25rem;
}

.skeleton-num {
    display: block;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
}

.skeleton-content {
    min-width: 0;
    flex: 1;
}

.skeleton-title {
    width: 6rem;
    height: 1rem;
}

.skeleton-arabic {
    width: 4rem;
    height: 1.25rem;
}

.skeleton-meta {
    width: 8rem;
    height: 0.625rem;
    margin-top: 0.375rem;
}

.skeleton-progress {
    height: 0.25rem;
    width: 100%;
    margin-top: 0.5rem;
}

@media (prefers-reduced-motion: reduce) {
    .skeleton-input,
    .skeleton-card .skeleton-num,
    .skeleton-line,
    .skeleton-progress {
        animation: none;
        background: #e2e8f0;
    }
}

@keyframes skeleton-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>
