<script setup lang="ts">
import { computed } from 'vue';
import type { Ayah } from '../../types/quran';
import TikrarCounter from './TikrarCounter.vue';

const props = defineProps<{
    ayah: Ayah;
    surahId: number;
    highlight?: boolean;
}>();

const verseNumber = computed(() => props.ayah.verseNumber);
</script>

<template>
    <div
        class="ayah-block"
        :class="{ highlight: highlight }"
    >
        <div class="ayah-content">
            <span class="ayah-num">{{ verseNumber }}</span>
            <span class="ayah-text">{{ ayah.textArab }}</span>
        </div>
        <p v-if="ayah.textIndoTranslation" class="ayah-translation">{{ ayah.textIndoTranslation }}</p>
        <TikrarCounter
            :surah-number="surahId"
            :ayah-number="verseNumber"
        />
    </div>
</template>

<style scoped>
.ayah-block {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    background: var(--ayah-bg, #f8f9fa);
    transition: background 0.2s;
}
.ayah-block.highlight {
    background: var(--ayah-highlight, #e8f4fd);
}
.ayah-content {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    text-align: right;
    direction: rtl;
}
.ayah-num {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent, #0d9488);
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 600;
}
.ayah-text {
    flex: 1;
    font-size: 1.125rem;
    line-height: 1.7;
}
.ayah-translation {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: var(--muted, #64748b);
    direction: ltr;
    text-align: left;
}
</style>
