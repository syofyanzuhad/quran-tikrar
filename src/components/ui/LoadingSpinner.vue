<script setup lang="ts">
defineProps<{
    size?: 'sm' | 'md' | 'lg';
}>();
</script>

<template>
    <div class="spinner" :class="[size ?? 'md']" role="status" aria-label="Loading">
        <span class="visually-hidden">Loading...</span>
    </div>
</template>

<style scoped>
.spinner {
    border: 3px solid var(--border, #e2e8f0);
    border-top-color: var(--accent, #0d9488);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
.spinner.sm {
    width: 1.25rem;
    height: 1.25rem;
    border-width: 2px;
}
.spinner.md {
    width: 2.5rem;
    height: 2.5rem;
}
.spinner.lg {
    width: 4rem;
    height: 4rem;
    border-width: 4px;
}
.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
