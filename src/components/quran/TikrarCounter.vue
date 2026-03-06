<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAyahTikrar } from '../../composables/useTikrar';
import { useReducedMotion } from '../../composables/useReducedMotion';
import { hapticRepIncrement, hapticBlockComplete } from '../../utils/haptic';

const props = withDefaults(
    defineProps<{
        blockId?: string;
        reps?: number;
        targetReps?: number;
        surahNumber?: number;
        ayahNumber?: number;
    }>(),
    {
        reps: 0,
        targetReps: 20,
        surahNumber: 0,
        ayahNumber: 0,
    }
);

const emit = defineEmits<{
    (e: 'increment'): void;
    (e: 'reset'): void;
}>();

const reducedMotion = useReducedMotion();
const { getCount, increment, reset } = useAyahTikrar();

const isBlockMode = computed(() => props.blockId != null);
const count = computed(() => {
    if (isBlockMode.value) return props.reps;
    return getCount(props.surahNumber, props.ayahNumber);
});

const target = computed(() => {
    if (isBlockMode.value) return props.targetReps;
    return 20;
});

const progress = computed(() => {
    const t = target.value;
    if (t <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((count.value / t) * 100)));
});

const popActive = ref(false);
const checkmarkActive = ref(false);

watch(
    progress,
    (p, prev) => {
        if (p >= 100 && target.value > 0 && (prev ?? 0) < 100) {
            checkmarkActive.value = true;
            hapticBlockComplete();
            setTimeout(() => {
                checkmarkActive.value = false;
            }, 1200);
        }
    },
    { immediate: true }
);

function triggerPop(): void {
    if (reducedMotion.value) return;
    popActive.value = true;
    setTimeout(() => {
        popActive.value = false;
    }, 400);
}

function handleIncrement(): void {
    if (isBlockMode.value) {
        hapticRepIncrement();
        triggerPop();
        emit('increment');
        return;
    }
    hapticRepIncrement();
    triggerPop();
    increment(props.surahNumber, props.ayahNumber);
}

function handleReset(): void {
    if (isBlockMode.value) {
        emit('reset');
        return;
    }
    reset(props.surahNumber, props.ayahNumber);
}
</script>

<template>
    <div class="tikrar-counter">
        <div class="counter-ring-wrap">
            <svg class="counter-ring -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    class="ring-bg"
                    stroke-width="10"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    class="ring-fill"
                    stroke-width="10"
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 42"
                    :stroke-dashoffset="(2 * Math.PI * 42) * (1 - progress / 100)"
                />
            </svg>

            <div class="counter-center">
                <div
                    class="counter-num"
                    :class="{ pop: popActive && !reducedMotion, complete: checkmarkActive }"
                >
                    {{ count }}
                </div>
                <div class="counter-target">/ {{ target }}</div>
            </div>

            <div
                v-if="checkmarkActive"
                class="checkmark-burst"
                aria-hidden="true"
            >
                <span class="checkmark-icon">✓</span>
            </div>

            <button
                v-if="count > 0"
                type="button"
                class="counter-reset-btn"
                aria-label="Reset tikrar count"
                @click.stop="handleReset"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                    <path
                        fill-rule="evenodd"
                        d="M10 3a7 7 0 1 0 6.32 4H14a1 1 0 1 1 0-2h4a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8.42A9 9 0 1 1 10 1a1 1 0 1 1 0 2Z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
        </div>

        <div class="counter-actions">
            <button
                type="button"
                class="counter-inc-btn"
                aria-label="Tambah satu pengulangan tikrar"
                @click="handleIncrement"
            >
                +
            </button>
            <span class="counter-label">Tikrar</span>
        </div>
    </div>
</template>

<style scoped>
.tikrar-counter {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.counter-ring-wrap {
    position: relative;
    height: 5rem;
    width: 5rem;
    flex-shrink: 0;
}

.counter-ring {
    height: 100%;
    width: 100%;
}

.ring-bg {
    fill: none;
    stroke: var(--counter-ring-bg, #e2e8f0);
}

.ring-fill {
    fill: none;
    stroke: #059669;
    transition: stroke-dashoffset 0.5s ease-out;
}

@media (prefers-reduced-motion: reduce) {
    .ring-fill {
        transition-duration: 0.1s;
    }
}

.counter-center {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
}

.counter-num {
    font-size: 1.5rem;
    font-weight: 800;
    tabular-nums: inherit;
    color: var(--counter-num-color, #0f172a);
    transition: transform 0.15s ease-out;
}

.counter-num.pop {
    animation: tikrar-pop 0.4s ease-out;
}

.counter-num.complete {
    animation: tikrar-complete 0.5s ease-out;
}

@media (prefers-reduced-motion: reduce) {
    .counter-num.pop,
    .counter-num.complete {
        animation: none;
    }
}

@keyframes tikrar-pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

@keyframes tikrar-complete {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
}

.counter-target {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--counter-target-color, #64748b);
}

.checkmark-burst {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
}

.checkmark-icon {
    font-size: 1.75rem;
    font-weight: 800;
    color: #059669;
    animation: checkmark-in 0.6s ease-out;
}

@media (prefers-reduced-motion: reduce) {
    .checkmark-icon {
        animation: none;
    }
}

@keyframes checkmark-in {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}

.counter-reset-btn {
    position: absolute;
    right: -0.25rem;
    top: -0.25rem;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--counter-reset-bg, #fff);
    color: #64748b;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    border: 1px solid var(--counter-reset-border, #e2e8f0);
    cursor: pointer;
    transition: transform 0.15s, background 0.15s;
}

.counter-reset-btn:hover {
    background: #f1f5f9;
}

.counter-reset-btn:active {
    transform: scale(0.98);
}

.counter-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.counter-inc-btn {
    min-width: 48px;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
    background: var(--counter-inc-bg, #0f172a);
    color: #fff;
    font-size: 1.5rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}

.counter-inc-btn:hover {
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
}

.counter-inc-btn:active {
    transform: scale(0.98);
}

.counter-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--counter-target-color, #64748b);
    text-transform: uppercase;
}

.dark .ring-bg {
    stroke: #334155;
}

.dark .ring-fill {
    stroke: #34d399;
}

.dark .counter-num { color: #f1f5f9; }
.dark .counter-target,
.dark .counter-label { color: #94a3b8; }
.dark .counter-reset-btn {
    background: #1e293b;
    border-color: #334155;
}
.dark .counter-reset-btn:hover { background: #334155; }
.dark .counter-inc-btn { background: #34d399; }
</style>
