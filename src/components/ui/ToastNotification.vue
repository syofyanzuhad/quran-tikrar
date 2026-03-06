<script setup lang="ts">
import { useToast } from '../../composables/useToast';

const { toasts, removeToast } = useToast();
</script>

<template>
    <div class="toast-container" aria-live="polite">
        <TransitionGroup name="toast">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="toast"
                :class="`toast-${toast.type}`"
                @click="removeToast(toast.id)"
            >
                <div class="toast-content">
                    <span v-if="toast.type === 'success'" class="toast-icon">✅</span>
                    <span v-else-if="toast.type === 'info'" class="toast-icon">ℹ️</span>
                    <span v-else-if="toast.type === 'error'" class="toast-icon">❌</span>
                    <span class="toast-message">{{ toast.message }}</span>
                </div>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-container {
    position: fixed;
    bottom: 5rem;
    left: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    z-index: 50;
    pointer-events: none;
}
.toast {
    pointer-events: auto;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 9999px;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    max-width: 90vw;
}
.toast-success {
    border: 1px solid var(--border, #e2e8f0);
}
:global(.dark) .toast {
    background: #1e293b;
    color: #f8fafc;
    border-color: #475569;
}
.toast-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.toast-message {
    font-size: 0.875rem;
    font-weight: 600;
}
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(20px);
}
</style>
