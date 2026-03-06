<script setup lang="ts">
import { computed } from 'vue';
import { useProgressStore } from '../stores/progressStore';
import { useTikrar } from '../composables/useTikrar';
import PageProgress from '../components/quran/PageProgress.vue';

const progressStore = useProgressStore();
const { totalTikrarCount } = useTikrar();

const records = computed(() => progressStore.records);
const completedPages = computed(() => progressStore.completedPages);
const totalPagesCompleted = computed(() => progressStore.totalPagesCompleted);

function clearProgress() {
    progressStore.clearRecords();
}
</script>

<template>
    <div class="progress-view">
        <header class="header">
            <h1>Progress</h1>
            <p class="subtitle">Memorization & tikrar summary</p>
        </header>

        <section class="stats">
            <div class="stat-card">
                <span class="stat-value">{{ totalPagesCompleted }}</span>
                <span class="stat-label">Pages completed</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">{{ totalTikrarCount }}</span>
                <span class="stat-label">Total tikrar</span>
            </div>
        </section>

        <section v-if="completedPages.length > 0" class="pages-section">
            <h2>Completed pages</h2>
            <div class="pages-list">
                <PageProgress
                    v-for="p in completedPages"
                    :key="p"
                    :page="p"
                    :total-pages="604"
                />
            </div>
        </section>

        <section v-if="records.length > 0" class="records-section">
            <h2>Recent records</h2>
            <ul class="records-list">
                <li
                    v-for="(r, i) in records.slice(-10).reverse()"
                    :key="String(r.page) + '-' + r.ayahFrom + '-' + r.ayahTo + '-' + i"
                    class="record-item"
                >
                    Surah {{ r.surahNumber }} · Page {{ r.page }} · {{ r.ayahFrom }}-{{ r.ayahTo }}
                </li>
            </ul>
        </section>

        <button
            v-if="records.length > 0"
            type="button"
            class="btn-clear"
            @click="clearProgress"
        >
            Clear progress
        </button>

        <p v-if="records.length === 0 && completedPages.length === 0" class="empty">
            No progress yet. Start reading from Home.
        </p>
    </div>
</template>

<style scoped>
.progress-view {
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
.stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.stat-card {
    padding: 1rem;
    background: var(--card-bg, #f8f9fa);
    border-radius: 0.5rem;
    text-align: center;
}
.stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent, #0d9488);
}
.stat-label {
    font-size: 0.75rem;
    color: var(--muted, #64748b);
}
.pages-section,
.records-section {
    margin-bottom: 1.5rem;
}
.pages-section h2,
.records-section h2 {
    font-size: 0.875rem;
    margin: 0 0 0.5rem 0;
    color: var(--muted, #64748b);
}
.pages-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}
.records-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.record-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border, #e2e8f0);
    font-size: 0.875rem;
}
.btn-clear {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 0.375rem;
    background: white;
    color: var(--muted, #64748b);
    cursor: pointer;
    font-size: 0.875rem;
}
.btn-clear:hover {
    background: var(--ayah-bg, #f1f5f9);
}
.empty {
    color: var(--muted, #64748b);
    padding: 2rem 0;
    font-size: 0.875rem;
}
</style>
