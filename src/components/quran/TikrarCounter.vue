<script setup lang="ts">
import { computed } from 'vue';
import { useAyahTikrar } from '../../composables/useTikrar';

const props = defineProps<{
    surahNumber: number;
    ayahNumber: number;
}>();

const { getCount, increment, reset } = useAyahTikrar();

const count = computed(() => getCount(props.surahNumber, props.ayahNumber));

function handleIncrement() {
    increment(props.surahNumber, props.ayahNumber);
}

function handleReset() {
    reset(props.surahNumber, props.ayahNumber);
}
</script>

<template>
    <div class="tikrar-counter">
        <span class="label">Tikrar</span>
        <span class="count">{{ count }}</span>
        <button
            type="button"
            class="btn-inc"
            aria-label="Increment tikrar"
            @click="handleIncrement"
        >
            +
        </button>
        <button
            v-if="count > 0"
            type="button"
            class="btn-reset"
            aria-label="Reset tikrar"
            @click="handleReset"
        >
            Reset
        </button>
    </div>
</template>

<style scoped>
.tikrar-counter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
}
.label {
    font-size: 0.75rem;
    color: var(--muted, #64748b);
}
.count {
    font-weight: 700;
    min-width: 1.5rem;
}
.btn-inc,
.btn-reset {
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    border: 1px solid var(--border, #e2e8f0);
    background: white;
    cursor: pointer;
}
.btn-inc:hover,
.btn-reset:hover {
    background: var(--ayah-bg, #f1f5f9);
}
.btn-reset {
    color: var(--muted, #64748b);
}
</style>
