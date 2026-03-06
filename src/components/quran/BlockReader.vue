<script setup lang="ts">
import { computed } from 'vue';
import type { Ayah, TikrarBlock, TikrarBlockColor } from '../../types/quran';
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
    }
);

const emit = defineEmits<{
    (e: 'block-tapped', blockIndex: number): void;
    (e: 'rep-incremented', blockId: string): void;
    (e: 'block-completed', blockId: string): void;
}>();

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
    return `﴾${toEasternArabicDigits(verseNumber)}﴿`;
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
            return 'bg-yellow-50 border-yellow-400';
        case 1:
            return 'bg-green-50 border-green-400';
        case 2:
            return 'bg-blue-50 border-blue-400';
        case 3:
            return 'bg-orange-50 border-orange-400';
        default:
            return 'bg-slate-50 border-slate-300';
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
        <div v-if="isBlockMode" class="px-4 pb-24 pt-4">
            <PageProgress
                :page="effectivePageNumber ?? 1"
                :total-pages="604"
            />

            <div class="mt-4 grid grid-cols-1 gap-3">
                <section
                    v-for="{ block, ayahs: blockAyahList } in blockAyahs"
                    :key="block.id"
                    class="relative origin-center cursor-pointer rounded-xl border border-slate-200 border-l-4 p-4 transition will-change-transform"
                    :class="[
                        blockColorClasses(block.blockIndex),
                        isActive(block.blockIndex) ? 'border-l-8 shadow-lg scale-[1.01]' : 'shadow-sm',
                        isComplete(block.id) ? 'opacity-70' : '',
                    ]"
                    @click="emit('block-tapped', block.blockIndex)"
                >
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-xs font-semibold tracking-widest text-slate-600 uppercase">
                                Blok {{ block.blockIndex + 1 }}
                            </p>
                        </div>

                        <div v-if="isComplete(block.id)" class="absolute right-3 top-3">
                            <span
                                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-emerald-600 shadow-sm ring-1 ring-emerald-200"
                                aria-label="Block complete"
                                title="Complete"
                            >
                                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                                    <path
                                        fill-rule="evenodd"
                                        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.57a1 1 0 0 1-1.42.003L3.29 9.78a1 1 0 1 1 1.42-1.41l3.37 3.39 6.79-6.47a1 1 0 0 1 1.414.001Z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <div
                        class="mt-3 arabic-font text-2xl leading-loose text-right"
                        dir="rtl"
                    >
                        <span
                            v-for="ayah in blockAyahList"
                            :key="ayah.id"
                            class="inline"
                        >
                            {{ ayah.textArab }}
                            <span class="mx-1 inline-block align-middle text-base text-slate-600/90">
                                {{ verseMarker(ayah.verseNumber) }}
                            </span>
                        </span>
                    </div>

                    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TikrarCounter
                            :block-id="block.id"
                            :reps="sessionReps?.[block.id] ?? 0"
                            :target-reps="targetReps"
                            @increment="emit('rep-incremented', block.id)"
                            @reset="emit('block-completed', block.id)"
                        />

                        <button
                            v-if="(sessionReps?.[block.id] ?? 0) >= (targetReps ?? 20)"
                            type="button"
                            class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
                            @click.stop="emit('block-completed', block.id)"
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
    font-family: 'Uthmanic Hafs', 'Scheherazade New', serif;
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
</style>
