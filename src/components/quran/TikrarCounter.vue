<script setup lang="ts">
import { computed } from 'vue';
import { useAyahTikrar } from '../../composables/useTikrar';

const props = withDefaults(
    defineProps<{
        /**
         * Block mode (controlled by parent).
         * When `blockId` is provided, this component will emit `increment/reset`
         * instead of mutating localStorage.
         */
        blockId?: string;
        reps?: number;
        targetReps?: number;

        /**
         * Legacy per-ayah mode (localStorage).
         */
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

function handleIncrement() {
    if (isBlockMode.value) {
        emit('increment');
        return;
    }
    increment(props.surahNumber, props.ayahNumber);
}

function handleReset() {
    if (isBlockMode.value) {
        emit('reset');
        return;
    }
    reset(props.surahNumber, props.ayahNumber);
}
</script>

<template>
    <div class="flex items-center gap-4">
        <div class="relative h-20 w-20 shrink-0">
            <svg class="h-20 w-20 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    class="fill-none stroke-slate-200"
                    stroke-width="10"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    class="fill-none stroke-emerald-600 transition-[stroke-dashoffset] duration-300"
                    stroke-width="10"
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 42"
                    :stroke-dashoffset="(2 * Math.PI * 42) * (1 - progress / 100)"
                />
            </svg>

            <div class="absolute inset-0 grid place-items-center">
                <div class="text-center">
                    <div class="text-2xl font-extrabold tabular-nums text-slate-900">
                        {{ count }}
                    </div>
                    <div class="text-xs font-semibold text-slate-500">
                        / {{ target }}
                    </div>
                </div>
            </div>

            <button
                v-if="count > 0"
                type="button"
                class="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]"
                aria-label="Reset tikrar"
                @click.stop="handleReset"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
                    <path
                        fill-rule="evenodd"
                        d="M10 3a7 7 0 1 0 6.32 4H14a1 1 0 1 1 0-2h4a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8.42A9 9 0 1 1 10 1a1 1 0 1 1 0 2Z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
        </div>

        <div class="flex flex-col items-start gap-2">
            <button
                type="button"
                class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-2xl font-bold text-white shadow-sm transition active:scale-[0.99]"
                aria-label="Increment tikrar"
                @click="handleIncrement"
            >
                +
            </button>
            <div class="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Tikrar
            </div>
        </div>
    </div>
</template>

<!-- styles are handled by Tailwind classes -->
