<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuranStore } from '../stores/quranStore';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';

const router = useRouter();
const quranStore = useQuranStore();

const surahs = computed(() => quranStore.surahs);
const loading = computed(() => quranStore.loading);
const error = computed(() => quranStore.error);

onMounted(async () => {
    if (quranStore.surahs.length === 0) {
        await quranStore.loadSurahList();
    }
});

function openReader(surahId: number) {
    router.push({ name: 'reader', params: { surahNumber: String(surahId) } });
}
</script>

<template>
    <div class="home-view">
        <header class="header">
            <h1>Quran Tikrar</h1>
            <p class="subtitle">Select a surah to read and practice</p>
        </header>

        <LoadingSpinner
            v-if="loading && surahs.length === 0"
            size="lg"
            class="center-spinner"
        />
        <p
            v-else-if="error"
            class="error"
        >
            {{ error }}
        </p>
        <ul
            v-else
            class="surah-list"
        >
            <li
                v-for="surah in surahs"
                :key="surah.id"
                class="surah-item"
            >
                <button
                    type="button"
                    class="surah-btn"
                    @click="openReader(surah.id)"
                >
                    <span class="num">{{ surah.id }}</span>
                    <span class="name">{{ surah.nameSimple }}</span>
                    <span class="arabic">{{ surah.nameArabic }}</span>
                    <span class="ayahs">{{ surah.versesCount }} ayahs</span>
                </button>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.home-view {
    padding: 1rem;
    padding-bottom: 5rem;
}
.header {
    margin-bottom: 1.5rem;
}
.header h1 {
    font-size: 1.5rem;
    margin: 0 0 0.25rem 0;
}
.subtitle {
    color: var(--muted, #64748b);
    font-size: 0.875rem;
    margin: 0;
}
.center-spinner {
    display: flex;
    justify-content: center;
    padding: 3rem;
}
.error {
    color: var(--error, #dc2626);
    padding: 1rem;
}
.surah-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.surah-item {
    margin-bottom: 0.5rem;
}
.surah-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--card-bg, #fff);
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
}
.surah-btn:hover {
    background: var(--ayah-bg, #f8f9fa);
}
.num {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent, #0d9488);
    color: white;
    border-radius: 0.375rem;
    font-weight: 600;
    font-size: 0.875rem;
}
.name {
    flex: 1;
    font-weight: 500;
}
.arabic {
    font-size: 1.125rem;
    direction: rtl;
}
.ayahs {
    font-size: 0.75rem;
    color: var(--muted, #64748b);
}
</style>
