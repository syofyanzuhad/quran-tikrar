<script setup lang="ts">
import { ref, computed } from 'vue';

const ONBOARDING_DONE_KEY = 'onboarding-done';

const step = ref(0);
const steps = [
    {
        title: 'Apa itu Tikrar?',
        body: 'Tikrar adalah metode menghafal dengan mengulang ayat atau blok ayat berkali-kali sampai hafal sebelum lanjut.',
    },
    {
        title: 'Cara pakai blok warna',
        body: 'Setiap halaman dibagi 4 blok (kuning, hijau, biru, oranye). Selesaikan pengulangan per blok, lalu tandai selesai dan lanjut ke blok berikutnya.',
    },
    {
        title: 'Mulai',
        body: 'Pilih surah atau juz dari beranda, buka halaman, lalu mulai hafal dengan counter Tikrar.',
    },
];

const currentStep = computed(() => steps[step.value] ?? steps[0]);
const isLastStep = computed(() => step.value === steps.length - 1);

function next(): void {
    if (isLastStep.value) {
        try {
            localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
        } catch {
            /* ignore */
        }
        emit('finish');
    } else {
        step.value += 1;
    }
}

function skip(): void {
    try {
        localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    } catch {
        /* ignore */
    }
    emit('finish');
}

const emit = defineEmits<{ finish: [] }>();
</script>

<template>
    <div class="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div class="onboarding-card">
            <h2 id="onboarding-title" class="onboarding-title">{{ currentStep?.title ?? '' }}</h2>
            <p class="onboarding-body">{{ currentStep?.body ?? '' }}</p>
            <div class="onboarding-dots">
                <span
                    v-for="(_, i) in steps"
                    :key="i"
                    class="dot"
                    :class="{ active: i === step }"
                    :aria-current="i === step ? 'step' : undefined"
                />
            </div>
            <div class="onboarding-actions">
                <button
                    type="button"
                    class="btn-skip"
                    @click="skip"
                >
                    Lewati
                </button>
                <button
                    type="button"
                    class="btn-next"
                    @click="next"
                >
                    {{ isLastStep ? 'Mulai' : 'Lanjut' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.onboarding {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.5);
    animation: overlay-in 0.25s ease-out;
}
@media (prefers-reduced-motion: reduce) {
    .onboarding {
        animation: none;
    }
}
@keyframes overlay-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
.onboarding-card {
    background: var(--onboarding-bg, #fff);
    color: var(--onboarding-text, #0f172a);
    border-radius: 1.25rem;
    padding: 1.75rem;
    max-width: 22rem;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: card-in 0.35s ease-out;
}
@media (prefers-reduced-motion: reduce) {
    .onboarding-card {
        animation: none;
    }
}
@keyframes card-in {
    from {
        opacity: 0;
        transform: translateY(12px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.onboarding-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.75rem 0;
}
.onboarding-body {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--onboarding-muted, #64748b);
    margin: 0 0 1.5rem 0;
}
.onboarding-dots {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1.5rem;
}
.dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--onboarding-dot, #cbd5e1);
    transition: transform 0.2s, background 0.2s;
}
.dot.active {
    background: var(--onboarding-dot-active, #1a7a4a);
    transform: scale(1.25);
}
@media (prefers-reduced-motion: reduce) {
    .dot {
        transition: none;
    }
}
.onboarding-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
}
.btn-skip {
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: var(--onboarding-muted, #64748b);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 0.5rem;
}
.btn-skip:hover {
    background: rgba(0, 0, 0, 0.05);
}
.btn-next {
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 1.25rem;
    border: none;
    background: var(--onboarding-cta, #1a7a4a);
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 0.5rem;
    transition: box-shadow 0.2s, transform 0.15s;
}
.btn-next:hover {
    box-shadow: 0 4px 12px rgba(26, 122, 74, 0.35);
}
.btn-next:active {
    transform: scale(0.98);
}
@media (prefers-reduced-motion: reduce) {
    .btn-next {
        transition: none;
    }
}
</style>
