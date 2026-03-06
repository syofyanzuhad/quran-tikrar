<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useProgress } from '../../composables/useProgress';

const props = defineProps<{
    page: number;
    totalPages?: number;
}>();

const { completedPages, refreshCompletedPages } = useProgress();

onMounted(() => {
    void refreshCompletedPages();
});

const isCompleted = computed(() => completedPages.value.includes(props.page));

const displayTotal = computed(() => props.totalPages ?? 604);
</script>

<template>
    <div class="page-progress">
        <span class="page-num">Halaman {{ page }}</span>
        <span
            class="badge"
            :class="{ completed: isCompleted }"
        >
            {{ isCompleted ? 'Selesai' : '—' }}
        </span>
        <span class="total">/ {{ displayTotal }}</span>
    </div>
</template>

<style scoped>
.page-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}
.page-num {
    font-weight: 500;
}
.badge {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--bg-muted, #e2e8f0);
    color: var(--muted, #64748b);
}
.badge.completed {
    background: var(--success-bg, #d1fae5);
    color: var(--success, #059669);
}
.total {
    color: var(--muted, #64748b);
}
</style>
