<script setup lang="ts">
import { computed } from 'vue';
import type { Ayah } from '../../types/quran';
import AyahBlock from './AyahBlock.vue';
import PageProgress from './PageProgress.vue';

const props = defineProps<{
    ayahs: Ayah[];
    surahNumber: number;
    currentPage?: number;
}>();

const pages = computed(() => {
    const byPage = new Map<number, Ayah[]>();
    for (const ayah of props.ayahs) {
        const p = ayah.page;
        if (!byPage.has(p)) byPage.set(p, []);
        byPage.get(p)!.push(ayah);
    }
    return Array.from(byPage.entries()).sort((a, b) => a[0] - b[0]);
});

const currentPageAyahs = computed(() => {
    const page = props.currentPage;
    if (page == null) return props.ayahs;
    return props.ayahs.filter((a) => a.page === page);
});
</script>

<template>
    <div class="block-reader">
        <template v-if="currentPage != null">
            <PageProgress
                :page="currentPage"
                :total-pages="604"
            />
            <div
                v-for="ayah in currentPageAyahs"
                :key="ayah.number"
                class="block"
            >
                <AyahBlock
                    :ayah="ayah"
                    :surah-number="surahNumber"
                />
            </div>
        </template>
        <template v-else>
            <div
                v-for="[pageNum, pageAyahs] in pages"
                :key="pageNum"
                class="page-block"
            >
                <PageProgress
                    :page="pageNum"
                    :total-pages="604"
                />
                <div
                    v-for="ayah in pageAyahs"
                    :key="ayah.number"
                    class="block"
                >
                    <AyahBlock
                        :ayah="ayah"
                        :surah-number="surahNumber"
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
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
