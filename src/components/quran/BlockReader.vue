<script setup lang="ts">
import { computed } from 'vue';
import type { Ayah, TikrarBlock, TikrarBlockColor } from '../../types/quran';
import { hapticBlockComplete } from '../../utils/haptic';
import { formatTranslationText } from '../../utils/translationText';
import { useToast } from '../../composables/useToast';
import AyahBlock from './AyahBlock.vue';
import PageProgress from './PageProgress.vue';
import TikrarCounter from './TikrarCounter.vue';

const props = withDefaults(
    defineProps<{
        /**
         * New (block UI) props.
         */
        pageNumber?: number;
        blocks?: TikrarBlock[];
        ayahs: Ayah[];
        activeBlockIndex?: number;
        sessionReps?: Record<string, number>;
        targetReps?: number;
        showTranslation?: boolean;
        showPageNumber?: boolean;
        isCombinedAvailable?: boolean;
        combinedId?: string;

        /**
         * Legacy props (kept for compatibility with current ReaderView).
         */
        surahId?: number;
        currentPage?: number;
    }>(),
    {
        activeBlockIndex: 0,
        sessionReps: () => ({}),
        targetReps: 20,
        showTranslation: true,
        showPageNumber: true,
    }
);

const emit = defineEmits<{
    (e: 'block-tapped', blockIndex: number): void;
    (e: 'rep-incremented', blockId: string): void;
    (e: 'block-completed', blockId: string): void;
    (e: 'combined-completed', combinedId: string): void;
}>();

const { addToast } = useToast();

function completeBlock(blockId: string): void {
    hapticBlockComplete();
    const blockIndexMatch = blockId.match(/block-(\d+)/);
    const blockIndex = blockIndexMatch?.[1] ? parseInt(blockIndexMatch[1], 10) + 1 : 1;
    addToast(`Blok ${blockIndex} selesai!`, 'success');
    emit('block-completed', blockId);
}

function completeCombined(combinedId: string): void {
    hapticBlockComplete();
    addToast('🌟 Masya Allah! Halaman selesai', 'success');
    emit('combined-completed', combinedId);
}

function toEasternArabicDigits(num: number): string {
    const map: Record<string, string> = {
        '0': '٠',
        '1': '١',
        '2': '٢',
        '3': '٣',
        '4': '٤',
        '5': '٥',
        '6': '٦',
        '7': '٧',
        '8': '٨',
        '9': '٩',
    };
    return String(num)
        .split('')
        .map((c) => map[c] ?? c)
        .join('');
}

function verseMarker(verseNumber: number): string {
    return `﴿${toEasternArabicDigits(verseNumber)}﴾`;
}

const effectivePageNumber = computed(() => props.pageNumber ?? props.currentPage ?? null);
const isBlockMode = computed(() => props.blocks != null && effectivePageNumber.value != null);

const pageAyahs = computed(() => {
    const page = effectivePageNumber.value;
    if (page == null) return props.ayahs;
    return props.ayahs.filter((a) => a.page === page);
});

function splitIntoFourBlocks<T>(items: T[]): T[][] {
    const n = items.length;
    const result: T[][] = [[], [], [], []];
    for (let i = 0; i < n; i++) {
        const idx = Math.min(3, Math.floor((i * 4) / Math.max(1, n)));
        result[idx]?.push(items[i] as T);
    }
    return result;
}

function colorForBlockIndex(blockIndex: number): TikrarBlockColor {
    switch (blockIndex) {
        case 0:
            return 'yellow';
        case 1:
            return 'green';
        case 2:
            return 'blue';
        case 3:
            return 'orange';
        default:
            return 'yellow';
    }
}

const resolvedBlocks = computed(() => {
    const page = effectivePageNumber.value ?? 1;
    if (props.blocks && props.blocks.length > 0) {
        const normalized = [...props.blocks].sort((a, b) => a.blockIndex - b.blockIndex);
        if (normalized.length === 4) return normalized;
        const fill = Array.from({ length: 4 }, (_, i) => {
            return (
                normalized.find((b) => b.blockIndex === i) ?? {
                    id: `page-${page}-block-${i}`,
                    pageNumber: page,
                    blockIndex: i,
                    ayahIds: [],
                    color: colorForBlockIndex(i),
                    targetReps: props.targetReps,
                }
            );
        });
        return fill;
    }

    // Fallback: build 4 blocks by splitting ayahs on the page.
    const groups = splitIntoFourBlocks(pageAyahs.value);
    return groups.map((group, i) => ({
        id: `page-${page}-block-${i}`,
        pageNumber: page,
        blockIndex: i,
        ayahIds: group.map((a) => a.id),
        color: colorForBlockIndex(i),
        targetReps: props.targetReps,
    })) satisfies TikrarBlock[];
});

const ayahById = computed(() => {
    const map = new Map<number, Ayah>();
    for (const a of props.ayahs) map.set(a.id, a);
    return map;
});

const blockAyahs = computed(() => {
    return resolvedBlocks.value.map((b) => {
        const list = b.ayahIds
            .map((id) => ayahById.value.get(id))
            .filter((a): a is Ayah => a != null)
            .sort((a, b) => a.verseNumber - b.verseNumber);
        return { block: b, ayahs: list };
    });
});

function blockColorClasses(blockIndex: number): string {
    switch (blockIndex) {
        case 0:
            return 'bg-yellow-200 border-yellow-500';
        case 1:
            return 'bg-green-200 border-green-500';
        case 2:
            return 'bg-blue-200 border-blue-500';
        case 3:
            return 'bg-orange-200 border-orange-500';
        default:
            return 'bg-slate-200 border-slate-400';
    }
}

function isComplete(blockId: string): boolean {
    return (props.sessionReps?.[blockId] ?? 0) >= (props.targetReps ?? 20);
}

function isActive(blockIndex: number): boolean {
    return blockIndex === (props.activeBlockIndex ?? 0);
}

const pages = computed(() => {
    const byPage = new Map<number, Ayah[]>();
    for (const ayah of props.ayahs) {
        const p = ayah.page;
        if (!byPage.has(p)) byPage.set(p, []);
        byPage.get(p)?.push(ayah);
    }
    return Array.from(byPage.entries()).sort((a, b) => a[0] - b[0]);
});
</script>

<template>
    <div class="w-full">
        <!-- New block UI (preferred) -->
        <div v-if="isBlockMode" class="pb-24 pt-2 sm:pt-4">
            <PageProgress
                v-if="showPageNumber"
                :page="effectivePageNumber ?? 1"
                :total-pages="604"
            />

            <div v-if="isCombinedAvailable && combinedId" class="mt-4">
                <section
                    class="block-card block-active"
                    style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-color: #059669;"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
                                Sesi Gabungan
                            </p>
                        </div>
                        <div v-if="isComplete(combinedId)" class="block-complete-badge">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fill-rule="evenodd"
                                    d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.003L3.29 9.78a1 1 0 1 1 1.42-1.41l3.37 3.39 6.79-6.47a1 1 0 0 1 1.414.001Z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>

                    <div
                        class="mt-3 arabic-font leading-loose text-right"
                        dir="rtl"
                        :style="{ fontSize: 'var(--arab-font-size, 1.875rem)' }"
                    >
                        <span
                            v-for="ayah in ayahs"
                            :key="ayah.id"
                            class="inline"
                        >
                            {{ ayah.textArab }}
                            <span class="mx-1 inline-block align-middle text-base text-emerald-700/80">
                                {{ verseMarker(ayah.verseNumber) }}
                            </span>
                        </span>
                    </div>
                    <p
                        v-if="showTranslation && ayahs.some((a) => a.textIndoTranslation)"
                        class="mt-4 text-left text-sm text-emerald-800"
                        dir="ltr"
                    >
                        {{ ayahs.map((a) => formatTranslationText(a.textIndoTranslation ?? '')).filter(Boolean).join(' ') }}
                    </p>

                    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TikrarCounter
                            :block-id="combinedId"
                            :reps="sessionReps?.[combinedId] ?? 0"
                            :target-reps="targetReps"
                            @increment="emit('rep-incremented', combinedId)"
                            @reset="completeCombined(combinedId)"
                        />

                        <button
                            v-if="(sessionReps?.[combinedId] ?? 0) >= (targetReps ?? 20)"
                            type="button"
                            class="mark-done-btn"
                            aria-label="Tandai halaman selesai"
                            @click.stop="completeCombined(combinedId)"
                        >
                            Halaman Selesai
                        </button>
                    </div>
                </section>
            </div>

            <div v-else class="mt-4 grid grid-cols-1 gap-3">
                <section
                    v-for="{ block, ayahs: blockAyahList } in blockAyahs"
                    :key="block.id"
                    class="block-card"
                    :class="[
                        blockColorClasses(block.blockIndex),
                        isActive(block.blockIndex) ? 'block-active' : '',
                        isComplete(block.id) ? 'block-completed' : '',
                    ]"
                    @click="emit('block-tapped', block.blockIndex)"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-xs font-semibold tracking-widest text-slate-600 dark:text-slate-300 uppercase">
                                Blok {{ block.blockIndex + 1 }}
                            </p>
                        </div>

                        <div v-if="isComplete(block.id)" class="block-complete-badge">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fill-rule="evenodd"
                                    d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.003L3.29 9.78a1 1 0 1 1 1.42-1.41l3.37 3.39 6.79-6.47a1 1 0 0 1 1.414.001Z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>

                    <div
                        class="mt-3 arabic-font leading-loose text-right"
                        dir="rtl"
                        :style="{ fontSize: 'var(--arab-font-size, 1.875rem)' }"
                    >
                        <span
                            v-for="ayah in blockAyahList"
                            :key="ayah.id"
                            class="inline"
                        >
                            {{ ayah.textArab }}
                            <span class="mx-1 inline-block align-middle text-base text-slate-600/90 dark:text-slate-300/90">
                                {{ verseMarker(ayah.verseNumber) }}
                            </span>
                        </span>
                    </div>
                    <p
                        v-if="showTranslation && blockAyahList.some((a) => a.textIndoTranslation)"
                        class="mt-2 text-left text-sm text-slate-500 dark:text-slate-400"
                        dir="ltr"
                    >
                        {{ blockAyahList.map((a) => formatTranslationText(a.textIndoTranslation ?? '')).filter(Boolean).join(' ') }}
                    </p>

                    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TikrarCounter
                            :block-id="block.id"
                            :reps="sessionReps?.[block.id] ?? 0"
                            :target-reps="targetReps"
                            @increment="emit('rep-incremented', block.id)"
                            @reset="completeBlock(block.id)"
                        />

                        <button
                            v-if="(sessionReps?.[block.id] ?? 0) >= (targetReps ?? 20)"
                            type="button"
                            class="mark-done-btn"
                            aria-label="Tandai blok selesai"
                            @click.stop="completeBlock(block.id)"
                        >
                            Tandai Selesai
                        </button>
                    </div>
                </section>
            </div>
        </div>

        <!-- Legacy UI (fallback until ReaderView is wired with blocks/session) -->
        <div v-else class="block-reader">
            <template v-if="currentPage != null">
                <PageProgress
                    :page="currentPage"
                    :total-pages="604"
                />
                <div
                    v-for="ayah in pageAyahs"
                    :key="ayah.id"
                    class="block"
                >
                    <AyahBlock
                        :ayah="ayah"
                        :surah-id="surahId ?? ayah.surahId"
                    />
                </div>
            </template>
            <template v-else>
                <div
                    v-for="[pageNum, pageAyahList] in pages"
                    :key="pageNum"
                    class="page-block"
                >
                    <PageProgress
                        :page="pageNum"
                        :total-pages="604"
                    />
                    <div
                        v-for="ayah in pageAyahList"
                        :key="ayah.id"
                        class="block"
                    >
                        <AyahBlock
                            :ayah="ayah"
                            :surah-id="surahId ?? ayah.surahId"
                        />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.arabic-font {
    font-family: 'Amiri', 'Uthmanic Hafs', 'Scheherazade New', serif;
}

.block-card {
    position: relative;
    cursor: pointer;
    border-radius: 0.75rem;
    border-width: 1px 1px 1px 4px;
    padding: 0.75rem;
    transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease, border-color 0.2s ease;
}

@media (min-width: 640px) {
    .block-card {
        padding: 1rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .block-card {
        transition-duration: 0.05s;
    }
}

.block-card.block-active {
    border-left-width: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: scale(1.01);
}

.block-card.block-active:not(.block-completed) {
    animation: block-slide-up 0.35s ease-out;
}

@media (prefers-reduced-motion: reduce) {
    .block-card.block-active:not(.block-completed) {
        animation: none;
    }
}

@keyframes block-slide-up {
    from {
        opacity: 0.85;
        transform: translateY(12px) scale(1);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1.01);
    }
}

.block-card.block-completed {
    opacity: 0.55;
    transform: translateY(4px) scale(1);
}

.mark-done-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: #059669;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}
.mark-done-btn:active {
    transform: scale(0.99);
}
@media (prefers-reduced-motion: reduce) {
    .mark-done-btn {
        transition: none;
    }
}
.block-reader {
    padding: 1rem 0;
}
.page-block {
    margin-bottom: 2rem;
}
.block {
    margin-bottom: 0.5rem;
}
.block-complete-badge {
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    display: inline-flex;
    height: 1.75rem;
    width: 1.75rem;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: rgba(255, 255, 255, 0.7);
    color: #059669;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.2);
}
.block-complete-badge svg {
    height: 1rem;
    width: 1rem;
}
:deep(.dark) .block-complete-badge {
    background-color: rgba(0, 0, 0, 0.5);
    border-color: rgba(16, 185, 129, 0.4);
}

/* Dark mode block colors */
:deep(.dark) .bg-yellow-50 { background-color: #23211f; }
:deep(.dark) .border-yellow-400 { border-color: #46433e; }
:deep(.dark) .bg-green-50 { background-color: #153A2D; }
:deep(.dark) .border-green-400 { border-color: #2C6E55; }
:deep(.dark) .bg-blue-50 { background-color: #1C2638; }
:deep(.dark) .border-blue-400 { border-color: #3A4E6B; }
:deep(.dark) .bg-orange-50 { background-color: #3D241C; }
:deep(.dark) .border-orange-400 { border-color: #663B2B; }
</style>
