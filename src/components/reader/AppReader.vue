<script setup lang="ts">
import { computed } from 'vue'
import type { TikrarBlockUI } from '../../types/reader'
import CombinedSessionCard from './CombinedSessionCard.vue'

export interface Ayah {
  arabic?: string
  text?: string
  translation?: string
  verseNumber?: number
  [key: string]: any
}

const toEasternArabic = (num: number) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().replace(/\d/g, (d) => digits[parseInt(d, 10)] ?? d)
}

const props = defineProps<{
  blocks: TikrarBlockUI[]
  ayahsMap: Record<number, Ayah>
  reps: number[]
  activeBlockIndex: number
  targetReps: number
  showTranslation: boolean
  pageNumber: number
  surahNameArabic: string
  combinedAvailable: boolean
  combinedReps: number
  combinedTarget: number
  combinedAyahIds: number[]
}>()

const emit = defineEmits<{
  'add-rep': [blockIndex: number]
  'reset-block': [blockIndex: number]
  'block-tap': [blockIndex: number]
  'add-combined-rep': []
  'reset-combined': []
}>()

const progressPercentage = computed(() => {
  if (!props.blocks || props.blocks.length === 0) return 0
  const totalReps = props.blocks.length * props.targetReps
  const currentTotal = props.reps.reduce((sum, curr) => sum + Math.min(curr, props.targetReps), 0)
  return Math.round((currentTotal / totalReps) * 100)
})

const isDone = (index: number) => (props.reps[index] || 0) >= props.targetReps
const isActive = (index: number) => props.activeBlockIndex === index

const strokeDasharray = 2 * Math.PI * 24

const getRingStrokeDashoffset = (rep: number, target: number) => {
  const cappedRep = Math.min(rep, target)
  const progress = cappedRep / target
  return strokeDasharray - progress * strokeDasharray
}
</script>

<template>
  <div class="app-reader">
    <header class="app-reader__header">
      <div class="app-reader__header-top">
        <div>
          <h1 class="app-reader__surah">{{ surahNameArabic }}</h1>
          <p class="app-reader__page">Halaman {{ pageNumber }}</p>
        </div>
        <div class="app-reader__progress">{{ progressPercentage }}%</div>
      </div>

      <div class="app-reader__dots">
        <div
          v-for="(block, i) in blocks"
          :key="block.index"
          class="app-reader__dot"
          :class="{ 'app-reader__dot--active': isActive(i) || isDone(i) }"
          :style="{
            backgroundColor: (isActive(i) || isDone(i)) ? block.color?.border : undefined,
            flex: isActive(i) || isDone(i) ? 1 : undefined
          }"
        />
      </div>
    </header>

    <div class="app-reader__content">
      <div
        v-for="(block, i) in blocks"
        :key="block.index"
        class="app-reader__block"
        :class="{
          'app-reader__block--active': isActive(i),
          'app-reader__block--done': !isActive(i) && isDone(i)
        }"
        :style="{
          backgroundColor: block.color?.bg,
          borderLeft: `3px solid ${block.color?.border}`,
          boxShadow: isActive(i) ? `0 4px 20px ${block.color?.border}40` : undefined
        }"
        @click="emit('block-tap', i)"
      >
        <div class="app-reader__block-body">
          <div class="app-reader__block-header">
            <div class="app-reader__block-label">
              <span class="app-reader__block-dot" :style="{ backgroundColor: block.color?.border }" />
              <span class="app-reader__block-title" :style="{ color: block.color?.accent }">
                {{ block.labelLatin }}
              </span>
            </div>
            <div v-if="isDone(i)" class="app-reader__block-done">
              <svg class="app-reader__block-check" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
              Selesai
            </div>
          </div>

          <div class="app-reader__arabic" dir="rtl">
            <span v-for="ayahId in block.ayahIds" :key="ayahId" class="app-reader__ayah">
              {{ ayahsMap[ayahId]?.arabic || ayahsMap[ayahId]?.text || 'Teks Arab tidak tersedia' }}
              <span
                class="app-reader__ayah-number"
                :style="{ backgroundColor: block.color?.soft, color: block.color?.accent }"
                dir="ltr"
              >
                {{ toEasternArabic(ayahsMap[ayahId]?.verseNumber || ayahId) }}
              </span>
            </span>
          </div>

          <div v-if="showTranslation" class="app-reader__translation">
            <div v-for="ayahId in block.ayahIds" :key="`trans-${ayahId}`" class="app-reader__translation-item">
              <span class="app-reader__translation-number">{{ ayahsMap[ayahId]?.verseNumber || ayahId }}.</span>
              <span v-html="ayahsMap[ayahId]?.translation || 'Terjemahan tidak tersedia.'" />
            </div>
          </div>
        </div>

        <div v-if="isActive(i)" class="app-reader__counter">
          <div class="app-reader__counter-card">
            <div class="app-reader__counter-progress">
              <div class="app-reader__ring">
                <svg class="app-reader__ring-svg" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" class="app-reader__ring-track" />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    class="app-reader__ring-fill"
                    :style="{
                      stroke: block.color?.border,
                      strokeDasharray: strokeDasharray,
                      strokeDashoffset: getRingStrokeDashoffset(reps[i] || 0, targetReps)
                    }"
                  />
                </svg>
                <div class="app-reader__ring-value">
                  <template v-if="isDone(i)">
                    <svg class="app-reader__ring-check" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                  </template>
                  <template v-else>
                    {{ reps[i] }}
                  </template>
                </div>
              </div>
              <div class="app-reader__counter-text">
                <span class="app-reader__counter-label">Pengulangan</span>
                <span class="app-reader__counter-value">
                  <strong>{{ reps[i] }}</strong>
                  <span class="app-reader__counter-total"> / {{ targetReps }}x</span>
                </span>
              </div>
            </div>

            <div class="app-reader__counter-actions">
              <button
                type="button"
                class="app-reader__add"
                :class="{ 'is-disabled': isDone(i) }"
                :style="!isDone(i) ? { backgroundColor: block.color?.border, boxShadow: `0 3px 10px ${block.color?.border}44` } : {}"
                :disabled="isDone(i)"
                @click.stop="emit('add-rep', i)"
              >
                <svg class="app-reader__add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
              </button>

              <button
                v-if="(reps[i] || 0) > 0"
                type="button"
                class="app-reader__reset"
                @click.stop="emit('reset-block', i)"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <CombinedSessionCard
        v-if="combinedAvailable"
        :ayah-ids="combinedAyahIds"
        :ayahs-map="ayahsMap"
        :reps="combinedReps"
        :target-reps="combinedTarget"
        :show-translation="showTranslation"
        variant="app"
        title="Sesi Gabungan"
        @add-rep="emit('add-combined-rep')"
        @reset="emit('reset-combined')"
      />
    </div>
  </div>
</template>

<style scoped>
.app-reader {
  min-height: 100vh;
  background: #f8fafc;
  color: #1f2937;
  padding-bottom: 6rem;
}

.app-reader__header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.app-reader__header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.app-reader__surah {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  font-family: 'Scheherazade New', 'Amiri', serif;
}

.app-reader__page {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.app-reader__progress {
  font-size: 1.6rem;
  font-weight: 800;
  color: #059669;
}

.app-reader__dots {
  display: flex;
  gap: 0.3rem;
  height: 6px;
  width: 100%;
}

.app-reader__dot {
  width: 16px;
  border-radius: 999px;
  background: #e2e8f0;
  transition: all 0.3s ease;
}

.app-reader__dot--active {
  width: auto;
}

.app-reader__content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.app-reader__block {
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.35s ease, box-shadow 0.35s ease, opacity 0.35s ease;
}

.app-reader__block--active {
  transform: scale(1.008);
  z-index: 10;
}

.app-reader__block--done {
  opacity: 0.65;
}

.app-reader__block-body {
  padding: 1rem;
}

.app-reader__block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}

.app-reader__block-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-reader__block-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.app-reader__block-title {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app-reader__block-done {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #15803d;
  background: #dcfce7;
  padding: 0.2rem 0.5rem;
  border-radius: 0.5rem;
}

.app-reader__block-check {
  width: 14px;
  height: 14px;
}

.app-reader__arabic {
  font-family: 'Scheherazade New', 'Amiri', serif;
  font-size: 1.25rem;
  line-height: 2.2;
  text-align: right;
}

.app-reader__ayah-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  margin: 0 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  transform: translateY(-2px);
}

.app-reader__translation {
  margin-top: 0.9rem;
  padding-top: 0.7rem;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.6;
}

.app-reader__translation-item {
  margin-bottom: 0.6rem;
}

.app-reader__translation-number {
  font-weight: 700;
  color: #94a3b8;
  margin-right: 0.35rem;
}

.app-reader__counter {
  padding: 0 1rem 1rem;
}

.app-reader__counter-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #f1f5f9;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.app-reader__counter-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-reader__ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.app-reader__ring-svg {
  width: 56px;
  height: 56px;
  transform: rotate(-90deg);
}

.app-reader__ring-track {
  stroke: #e5e7eb;
  stroke-width: 4;
  fill: none;
}

.app-reader__ring-fill {
  stroke-width: 4;
  stroke-linecap: round;
  fill: none;
  transition: stroke-dashoffset 0.45s ease;
}

.app-reader__ring-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #334155;
}

.app-reader__ring-check {
  width: 22px;
  height: 22px;
  color: #22c55e;
}

.app-reader__counter-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.app-reader__counter-label {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
}

.app-reader__counter-value {
  color: #334155;
}

.app-reader__counter-value strong {
  font-size: 1.25rem;
}

.app-reader__counter-total {
  color: #94a3b8;
  font-size: 0.85rem;
}

.app-reader__counter-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.app-reader__add {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.app-reader__add:active {
  transform: scale(0.96);
}

.app-reader__add.is-disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.app-reader__add-icon {
  width: 22px;
  height: 22px;
}

.app-reader__reset {
  border: none;
  background: transparent;
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
  cursor: pointer;
}

.app-reader__reset:hover {
  color: #ef4444;
}

@media (max-width: 420px) {
  .app-reader__counter-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .app-reader__counter-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
