<script setup lang="ts">
import { computed } from 'vue'

export interface CombinedAyah {
  arabic?: string
  text?: string
  translation?: string
  verseNumber?: number
  [key: string]: any
}

const props = defineProps<{
  ayahIds: number[]
  ayahsMap: Record<number, CombinedAyah>
  reps: number
  targetReps: number
  showTranslation: boolean
  variant: 'app' | 'mushaf'
  title?: string
}>()

const emit = defineEmits<{
  'add-rep': []
  'reset': []
}>()

const strokeDasharray = 2 * Math.PI * 24

const ringOffset = computed(() => {
  const capped = Math.min(props.reps, props.targetReps)
  const progress = props.targetReps <= 0 ? 1 : capped / props.targetReps
  return strokeDasharray - progress * strokeDasharray
})

const isDone = computed(() => props.reps >= props.targetReps)

const toEasternArabic = (num: number) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().replace(/\d/g, (d) => digits[parseInt(d, 10)] ?? d)
}
</script>

<template>
  <section
    class="combined-card"
    :class="[`combined-card--${variant}`, isDone ? 'combined-card--done' : '']"
  >
    <header class="combined-card__header">
      <div class="combined-card__title-wrap">
        <span class="combined-card__badge">Gabungan</span>
        <h3 class="combined-card__title">{{ title ?? 'Sesi Gabungan' }}</h3>
        <span v-if="isDone" class="combined-card__status">Selesai</span>
      </div>
      <div class="combined-card__progress">
        <div class="combined-card__ring">
          <svg class="combined-card__ring-svg" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" class="combined-card__ring-track" />
            <circle
              cx="28"
              cy="28"
              r="24"
              class="combined-card__ring-fill"
              :style="{ strokeDasharray: strokeDasharray, strokeDashoffset: ringOffset }"
            />
          </svg>
          <div class="combined-card__ring-value">
            <template v-if="isDone">
              <svg class="combined-card__check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </template>
            <template v-else>
              {{ reps }}
            </template>
          </div>
        </div>
        <div class="combined-card__progress-text">
          <span class="combined-card__progress-label">Pengulangan</span>
          <span class="combined-card__progress-value">{{ reps }} / {{ targetReps }}x</span>
        </div>
      </div>
    </header>

    <div class="combined-card__ayahs" dir="rtl">
      <span v-for="ayahId in ayahIds" :key="ayahId" class="combined-card__ayah">
        {{ ayahsMap[ayahId]?.arabic || ayahsMap[ayahId]?.text || 'Teks Arab tidak tersedia' }}
        <span class="combined-card__ayah-number" dir="ltr">
          {{ toEasternArabic(ayahsMap[ayahId]?.verseNumber || ayahId) }}
        </span>
      </span>
    </div>

    <div v-if="showTranslation" class="combined-card__translation">
      <div v-for="ayahId in ayahIds" :key="`trans-${ayahId}`" class="combined-card__translation-item">
        <span class="combined-card__translation-number">{{ ayahsMap[ayahId]?.verseNumber || ayahId }}.</span>
        <span v-html="ayahsMap[ayahId]?.translation || 'Terjemahan tidak tersedia.'" />
      </div>
    </div>

    <div class="combined-card__actions">
      <button
        v-if="reps > 0"
        type="button"
        class="combined-card__reset"
        @click="emit('reset')"
      >
        Reset
      </button>
      <button
        type="button"
        class="combined-card__add"
        :disabled="isDone"
        @click="emit('add-rep')"
      >
        <span class="combined-card__add-icon">+</span>
        <span>{{ isDone ? 'Selesai' : 'Tambah' }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.combined-card {
  margin: 1.25rem 1rem 1.5rem;
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 1.1rem 1.1rem 1.3rem;
  border: 2px solid #059669;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  color: #0f172a;
  box-shadow: 0 10px 24px rgba(5, 150, 105, 0.18);
}

.combined-card--mushaf {
  margin: 1.25rem auto 2rem;
  max-width: 360px;
  border-radius: 10px;
  border-color: #1f8d57;
  background: linear-gradient(135deg, #effaf3, #d9f2e4);
  box-shadow: 0 10px 20px rgba(5, 150, 105, 0.2);
}

.combined-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.combined-card__title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.combined-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(5, 150, 105, 0.18);
  color: #065f46;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.combined-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #065f46;
}

.combined-card__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #166534;
  background: rgba(22, 101, 52, 0.12);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  width: max-content;
}

.combined-card__progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.combined-card__ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.combined-card__ring-svg {
  width: 56px;
  height: 56px;
  transform: rotate(-90deg);
}

.combined-card__ring-track {
  stroke: rgba(5, 150, 105, 0.2);
  stroke-width: 4;
  fill: none;
}

.combined-card__ring-fill {
  stroke: #059669;
  stroke-width: 4;
  stroke-linecap: round;
  fill: none;
  transition: stroke-dashoffset 0.4s ease;
}

.combined-card__ring-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #065f46;
}

.combined-card__check {
  width: 22px;
  height: 22px;
  animation: combined-check 0.45s ease-out;
}

.combined-card__progress-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.combined-card__progress-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #16a34a;
  font-weight: 700;
}

.combined-card__progress-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
}

.combined-card__ayahs {
  margin-top: 1rem;
  font-family: 'Scheherazade New', 'Amiri', serif;
  font-size: 1.05rem;
  line-height: 2.1;
  text-align: right;
}

.combined-card__ayah {
  display: inline;
}

.combined-card__ayah-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 0.35rem;
  border-radius: 999px;
  background: rgba(5, 150, 105, 0.15);
  color: #065f46;
  font-size: 0.7rem;
  font-weight: 700;
  transform: translateY(-2px);
}

.combined-card__translation {
  margin-top: 0.9rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(5, 150, 105, 0.2);
  color: #334155;
  font-size: 0.9rem;
  line-height: 1.6;
}

.combined-card__translation-item {
  margin-bottom: 0.6rem;
}

.combined-card__translation-number {
  font-weight: 700;
  color: #16a34a;
  margin-right: 0.35rem;
}

.combined-card__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.1rem;
}

.combined-card__reset {
  background: transparent;
  border: 1px solid rgba(5, 150, 105, 0.3);
  color: #047857;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.combined-card__add {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  border-radius: 12px;
  padding: 0.55rem 1.1rem;
  background: #059669;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(5, 150, 105, 0.25);
}

.combined-card__add:disabled {
  background: rgba(5, 150, 105, 0.4);
  box-shadow: none;
  cursor: not-allowed;
}

.combined-card--done {
  border-color: #16a34a;
  box-shadow: 0 12px 26px rgba(22, 163, 74, 0.25);
  animation: combined-celebrate 0.7s ease-out;
}

.combined-card--done::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(circle at 20% 25%, rgba(255, 255, 255, 0.6), transparent 55%),
    radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.5), transparent 60%),
    radial-gradient(circle at 35% 75%, rgba(255, 255, 255, 0.4), transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.35), transparent 60%);
  opacity: 0.35;
  animation: combined-sparkle 2.8s ease-in-out infinite;
}

@keyframes combined-celebrate {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(22, 163, 74, 0.0);
  }
  50% {
    transform: scale(1.01);
    box-shadow: 0 14px 28px rgba(22, 163, 74, 0.28);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 12px 26px rgba(22, 163, 74, 0.25);
  }
}

@keyframes combined-sparkle {
  0% { opacity: 0.2; filter: blur(0px); }
  50% { opacity: 0.4; filter: blur(0.4px); }
  100% { opacity: 0.2; filter: blur(0px); }
}

@media (prefers-reduced-motion: reduce) {
  .combined-card--done {
    animation: none;
  }
  .combined-card__check {
    animation: none;
  }
  .combined-card--done::after {
    animation: none;
  }
}

@keyframes combined-check {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.combined-card__add-icon {
  font-size: 1.1rem;
  line-height: 1;
}

@media (max-width: 420px) {
  .combined-card {
    margin-left: 0.75rem;
    margin-right: 0.75rem;
  }
}
</style>
