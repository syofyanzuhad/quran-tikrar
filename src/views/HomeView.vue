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
        <header class="mb-4">
            <h1 class="text-xl font-extrabold tracking-tight text-slate-900">Quran Tikrar</h1>
            <p class="mt-1 text-sm text-slate-500">Baca dan hafal per halaman</p>
        </header>

        <!-- Tabs -->
        <div class="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1">
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
            <!-- Skeleton for surah list -->
            <section class="space-y-4">
                <div class="skeleton-input" />
                <ul class="space-y-2">
                    <li v-for="i in 8" :key="i" class="surah-card skeleton-card">
                        <div class="flex w-full items-start gap-3">
                            <span class="skeleton-num" />
                            <div class="skeleton-content">
                                <div class="skeleton-line skeleton-title" />
                                <div class="skeleton-line skeleton-arabic" dir="rtl" />
                                <div class="skeleton-line skeleton-meta" />
                                <div class="skeleton-progress" />
                            </div>
                        </div>
                    </li>
                </ul>
            </section>
        </template>

        <template v-else>
            <!-- Tab 1: Per Surah -->
            <section v-show="activeTab === 'surah'" class="space-y-4">
                <div class="relative">
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="Cari surah (Arab atau Latin)..."
                        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm"
                    />
                </div>
                <ul class="space-y-2">
                    <li v-for="surah in filteredSurahs" :key="surah.id">
                        <button
                            type="button"
                            class="surah-card"
                            @click="openSurah(surah.id)"
                        >
                            <div class="flex w-full items-start gap-3">
                                <span class="num">{{ surah.id }}</span>
                                <div class="min-w-0 flex-1 text-left">
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="name">{{ surah.nameSimple }}</span>
                                        <span
                                            class="badge"
                                            :class="surah.revelationPlace === 'makkah' ? 'badge-makkiyah' : 'badge-madaniyah'"
                                        >
                                            {{ surah.revelationPlace === 'makkah' ? 'Makkiyah' : 'Madaniyah' }}
                                        </span>
                                    </div>
                                    <p class="arabic mt-0.5 text-right text-lg" dir="rtl">
                                        {{ surah.nameArabic }}
                                    </p>
                                    <p class="text-xs text-slate-500">{{ surah.versesCount }} ayat</p>
                                    <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            class="h-full rounded-full bg-[#1a7a4a] transition-[width] duration-300"
                                            :style="{ width: `${getSurahProgress(surah.id)}%` }"
                                        />
                                    </div>
                                </div>
                            </div>
                        </button>
                    </li>
                </ul>
            </section>

            <!-- Tab 2: Per Juz -->
            <section v-show="activeTab === 'juz'" class="grid grid-cols-2 gap-3">
                <button
                    v-for="item in juzProgressList"
                    :key="item.juzNumber"
                    type="button"
                    class="juz-card"
                    :class="{ completed: item.status === 'completed' }"
                    @click="openPage(item.firstPage)"
                >
                    <p class="font-bold text-slate-900">Juz {{ item.juzNumber }}</p>
                    <p class="mt-1 text-xs text-slate-600">{{ item.surahRange }}</p>
                    <p class="mt-2 text-sm font-semibold text-[#1a7a4a]">{{ item.percentage.toFixed(0) }}%</p>
                </button>
            </section>

            <!-- Tab 3: Lanjutkan -->
            <section v-show="activeTab === 'continue'" class="flex flex-col items-center py-8">
                <template v-if="lastPage != null">
                    <p class="text-sm text-slate-600">Halaman terakhir yang dibuka</p>
                    <button
                        type="button"
                        class="continue-btn"
                        @click="openPage(lastPage)"
                    >
                        ▶ Lanjutkan Halaman {{ lastPage }}
                    </button>
                </template>
                <template v-else>
                    <p class="text-center text-sm text-slate-600">Belum ada halaman terakhir.</p>
                    <p class="mt-2 text-center text-xs text-slate-500">
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
.surah-card {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: white;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
}
.surah-card:hover {
    background: #f8fafc;
}
.num {
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #1a7a4a;
    color: white;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
}
.badge {
    flex-shrink: 0;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
}
.badge-makkiyah {
    background: #fef3c7;
    color: #92400e;
}
.badge-madaniyah {
    background: #dbeafe;
    color: #1e40af;
}
.arabic {
    font-family: 'Uthmanic Hafs', 'Scheherazade New', serif;
}
.juz-card {
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: white;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
}
.juz-card:hover {
    background: #f8fafc;
}
.juz-card.completed {
    background: #dcfce7;
    border-color: #86efac;
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
    width: 2.25rem;
    height: 2.25rem;
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
    width: 8rem;
    height: 1.25rem;
    margin-top: 0.5rem;
}
.skeleton-meta {
    width: 4rem;
    height: 0.75rem;
    margin-top: 0.5rem;
}
.skeleton-progress {
    height: 0.375rem;
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
