<script setup lang="ts">
import { onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useQuranStore } from '../stores/quranStore';
import BlockReader from '../components/quran/BlockReader.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';

const route = useRoute();
const quranStore = useQuranStore();

const surahNumber = computed(() => Number(route.params.surahNumber) || 1);
const currentPage = computed(() => {
    const raw = route.query.page;
    const num = typeof raw === 'string' ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN;
    return Number.isFinite(num) ? num : undefined;
});

const currentSurah = computed(() => quranStore.currentSurah);
const currentAyahs = computed(() => quranStore.currentAyahs);
const loading = computed(() => quranStore.loading);

onMounted(() => {
    quranStore.loadSurah(surahNumber.value);
});

watch(surahNumber, (num) => {
    quranStore.loadSurah(num);
});
</script>

<template>
    <div class="reader-view">
        <header class="header" v-if="currentSurah">
            <h1 class="title">{{ currentSurah.nameSimple }}</h1>
            <p class="meta">{{ currentSurah.nameArabic }} · {{ currentSurah.versesCount }} ayahs</p>
        </header>

        <LoadingSpinner
            v-if="loading && currentAyahs.length === 0"
            size="lg"
            class="center-spinner"
        />
        <BlockReader
            v-else-if="currentAyahs.length > 0"
            :ayahs="currentAyahs"
            :surah-id="surahNumber"
            :current-page="currentPage"
        />
        <p v-else class="empty">No ayahs loaded.</p>
    </div>
</template>

<style scoped>
.reader-view {
    padding: 1rem;
    padding-bottom: 5rem;
}
.header {
    margin-bottom: 1rem;
}
.title {
    font-size: 1.25rem;
    margin: 0 0 0.25rem 0;
}
.meta {
    font-size: 0.875rem;
    color: var(--muted, #64748b);
    margin: 0;
}
.center-spinner {
    display: flex;
    justify-content: center;
    padding: 3rem;
}
.empty {
    color: var(--muted, #64748b);
    padding: 2rem;
}
</style>
