<script setup lang="ts">
import { onMounted, inject, computed, ref } from 'vue'
import type { MushafPage } from '../../types/quran'
import { getBlockColor } from '../../constants/blockColors'
import { SETTINGS_KEY, type SettingsState } from '../../composables/useSettings'
import MushafLine from './MushafLine.vue'

const props = defineProps<{
  page: MushafPage | null
  reps: number[]
  activeBlockIndex: number
  targetReps: number
  fontSizeScale: number
}>()

const emit = defineEmits<{
  'add-rep': [blockIndex: number]
  'reset-block': [blockIndex: number]
  'block-tap': [blockIndex: number]
  'need-page': []
}>()

onMounted(() => {
  if (!props.page) {
    emit('need-page')
  }
})

const strokeDasharray = 2 * Math.PI * 16
const getRingStrokeDashoffset = (rep: number, target: number) => {
  const cappedRep = Math.min(rep, target)
  const progress = cappedRep / target
  return strokeDasharray - progress * strokeDasharray
}

const isDone = (index: number) => (props.reps[index] || 0) >= props.targetReps

const arabicBlockNumbers = ['١', '٢', '٣', '٤']

const settings = inject<SettingsState | null>(SETTINGS_KEY)
const blockMode = computed(() => settings?.blockColorMode.value || 'default')
const isDark = computed(() => settings?.darkMode.value || false)

const getBlockColorSafe = (index: number) => getBlockColor(index, blockMode.value, isDark.value)

const isLegendExpanded = ref(false)
const toggleLegend = () => { isLegendExpanded.value = !isLegendExpanded.value }
</script>

<template>
  <div class="mushaf-page-container">
    <div
      v-if="!page"
      class="mushaf-card mushaf-card--skeleton"
    >
      <div class="mushaf-ornament"></div>
      <div class="mushaf-card__body">
        <div
          v-for="i in 15"
          :key="i"
          class="mushaf-skeleton-line"
          :style="{ width: i % 3 === 0 ? '75%' : (i % 2 === 0 ? '90%' : '100%') }"
        ></div>
      </div>
      <div class="mushaf-ornament"></div>
    </div>

    <div
      v-else
      class="mushaf-card"
    >
      <div class="mushaf-ornament"></div>

      <div class="mushaf-header">
        {{ page.surahNameArabic }}
      </div>

      <div class="mushaf-blocks">
        <template v-for="block in page.blocks" :key="block.blockIndex">
          <div
            class="mushaf-block"
            :class="{
              'mushaf-block--active': activeBlockIndex === block.blockIndex,
              'mushaf-block--done': activeBlockIndex !== block.blockIndex && isDone(block.blockIndex),
              'mushaf-block--pending': activeBlockIndex !== block.blockIndex && !isDone(block.blockIndex)
            }"
            :style="{
              backgroundColor: isDone(block.blockIndex) 
                  ? '#F8F5EE' 
                  : (getBlockColorSafe(block.blockIndex)?.mushafBg || '#FFF8E7'),
              borderLeft: `5px solid ${isDone(block.blockIndex)
                  ? (getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842') + '66'
                  : (getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842')}`,
              borderBottom: block.blockIndex < 3
                ? `1px dashed ${(getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842')}44`
                : 'none'
            }"
            @click="emit('block-tap', block.blockIndex)"
          >
            <div
              v-if="activeBlockIndex === block.blockIndex"
              class="mushaf-block__texture"
            ></div>

            <div
              class="mushaf-block__badge"
              :style="{
                backgroundColor: isDone(block.blockIndex)
                  ? (getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842') + '88'
                  : (getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842'),
                color: '#fff'
              }"
            >
              {{ arabicBlockNumbers[block.blockIndex] }}
            </div>

            <div class="mushaf-lines">
              <template v-for="line in block.lines" :key="line.lineNumber">
                <div
                  v-if="line.surahBreakArabic"
                  class="mushaf-surah-break"
                >
                  <div class="mushaf-surah-break__line"></div>
                  <div class="mushaf-surah-break__text">سُورَةُ {{ line.surahBreakArabic }}</div>
                </div>

                <MushafLine
                  :line="line"
                  :blockColor="getBlockColorSafe(block.blockIndex) || getBlockColorSafe(0)!"
                  :isActiveBlock="activeBlockIndex === block.blockIndex"
                  :fontSizeScale="fontSizeScale"
                  v-memo="[line, activeBlockIndex === block.blockIndex, isDone(block.blockIndex), fontSizeScale, blockMode, isDark]"
                  :style="{
                    opacity: activeBlockIndex !== block.blockIndex && isDone(block.blockIndex) ? 0.75 : 1
                  }"
                />
              </template>
            </div>

            <div
              v-if="activeBlockIndex === block.blockIndex"
              class="mushaf-counter"
              @click.stop
            >
              <div class="mushaf-counter__progress">
                <div class="mushaf-counter__ring">
                  <svg class="mushaf-counter__ring-svg" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" class="mushaf-counter__ring-track" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      class="mushaf-counter__ring-fill"
                      :style="{
                        stroke: getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842',
                        strokeDasharray: strokeDasharray,
                        strokeDashoffset: getRingStrokeDashoffset(reps[block.blockIndex] || 0, targetReps)
                      }"
                    />
                  </svg>
                  <div class="mushaf-counter__ring-value" :style="{ color: getBlockColorSafe(block.blockIndex)?.mushafInk || '#1A1209' }">
                    <template v-if="isDone(block.blockIndex)">
                      <svg class="mushaf-counter__check" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </template>
                    <template v-else>
                      {{ reps[block.blockIndex] }}
                    </template>
                  </div>
                </div>

                <div class="mushaf-counter__text">
                  <span class="mushaf-counter__label">Blok {{ block.blockIndex + 1 }}</span>
                  <div class="mushaf-counter__bar">
                    <div
                      class="mushaf-counter__bar-fill"
                      :style="{
                        width: `${Math.min(100, ((reps[block.blockIndex] || 0) / targetReps) * 100)}%`,
                        backgroundColor: getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842'
                      }"
                    ></div>
                  </div>
                  <span class="mushaf-counter__count">{{ reps[block.blockIndex] }}/{{ targetReps }} kali</span>
                </div>
              </div>

              <div class="mushaf-counter__actions">
                <button
                  v-if="(reps[block.blockIndex] || 0) > 0"
                  type="button"
                  class="mushaf-counter__reset"
                  @click.stop="emit('reset-block', block.blockIndex)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="mushaf-counter__reset-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg>
                </button>
                <button
                  type="button"
                  class="mushaf-counter__add"
                  :disabled="isDone(block.blockIndex)"
                  :style="{ backgroundColor: isDone(block.blockIndex) ? '#E8DCC8' : (getBlockColorSafe(block.blockIndex)?.mushafBorder || '#F5C842') }"
                  @click.stop="emit('add-rep', block.blockIndex)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="mushaf-counter__add-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4.5v15m7.5-7.5h-15"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="mushaf-footer">
        <span>HAL. {{ page.pageNumber }}</span>
        <div class="mushaf-footer__dots">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="mushaf-footer__surah">{{ page.surahNameArabic }}</span>
      </div>

      <div class="mushaf-ornament"></div>
    </div>

    <div
      v-if="page"
      class="mushaf-legend"
      :class="{ 'mushaf-legend--expanded': isLegendExpanded }"
    >
      <div class="mushaf-legend__panel">
        <div class="mushaf-legend__content" :class="{ 'mushaf-legend__content--collapsed': !isLegendExpanded }">
          <h4 class="mushaf-legend__title">Progress Blok</h4>
          <div
            v-for="block in page.blocks"
            :key="`legend-${block.blockIndex}`"
            class="mushaf-legend__item"
            :style="{
              backgroundColor: activeBlockIndex === block.blockIndex ? (isDark ? '#334155' : '#F1F5F9') : 'transparent',
              borderColor: activeBlockIndex === block.blockIndex ? (getBlockColorSafe(block.blockIndex)?.border || '#C8BFA8') : (isDark ? '#475569' : '#E2E8F0'),
              color: activeBlockIndex === block.blockIndex ? (getBlockColorSafe(block.blockIndex)?.accent || '#9C8868') : (isDark ? '#94A3B8' : '#64748B')
            }"
            @click="emit('block-tap', block.blockIndex)"
          >
            <span class="mushaf-legend__dot" :style="{ backgroundColor: getBlockColorSafe(block.blockIndex)?.border || '#C8BFA8' }"></span>
            <span class="mushaf-legend__label">Blok {{ block.blockIndex + 1 }}</span>
            <span class="mushaf-legend__count">{{ reps[block.blockIndex] }}/{{ targetReps }}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="mushaf-legend__toggle"
        :aria-label="isLegendExpanded ? 'Tutup Legend' : 'Buka Legend'"
        @click="toggleLegend"
      >
        <svg v-if="isLegendExpanded" xmlns="http://www.w3.org/2000/svg" class="mushaf-legend__toggle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="mushaf-legend__toggle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.mushaf-page-container {
  min-height: 100vh;
  padding: 2rem 1rem 7.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #E8E0D0;
}

.mushaf-card {
  width: 100%;
  max-width: 360px;
  background: #FEFCF5;
  border-radius: 3px;
  box-shadow: 2px 3px 0 #C8BFA8, 4px 6px 0 #B8AF98, 0 8px 32px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.mushaf-card--skeleton {
  aspect-ratio: 1 / 1.6;
}

.mushaf-ornament {
  height: 6px;
  background: linear-gradient(to right, #8B7355, #C4A882, #8B7355);
}

.mushaf-card__body {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.mushaf-skeleton-line {
  height: 16px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.35);
}

.mushaf-header {
  padding: 0.35rem 1rem;
  text-align: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #8B7355;
  border-bottom: 1px solid #E8DCC8;
  font-family: 'Scheherazade New', 'Amiri', serif;
}

.mushaf-blocks {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.mushaf-block {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-right: 6px;
  cursor: pointer;
  transition: background-color 0.4s ease;
}

.mushaf-block__texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.2;
  mix-blend-mode: multiply;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.05) 31px, rgba(0,0,0,0.05) 32px);
}

.mushaf-block__badge {
  position: absolute;
  top: 8px;
  left: 0;
  width: 20px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  z-index: 10;
}

.mushaf-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4px 0 0 1rem;
  position: relative;
  z-index: 10;
}

.mushaf-surah-break {
  margin: 0.5rem 0;
  padding: 0.35rem 0;
  width: 100%;
  text-align: center;
  border-radius: 4px;
  border: 1px solid #E8DCC8;
  background-color: #FEFCF5;
  position: relative;
  background-image: linear-gradient(90deg, rgba(196, 168, 130, 0.25) 50%, rgba(255, 255, 255, 0) 0%);
  background-size: 8px 2px;
  background-repeat: repeat-x;
  background-position: center;
}

.mushaf-surah-break__line {
  position: absolute;
  inset: 0;
  height: 1px;
  top: 50%;
  transform: translateY(-50%);
  background: #E8DCC8;
}

.mushaf-surah-break__text {
  position: relative;
  padding: 0 1.5rem;
  background: #FEFCF5;
  font-family: 'Scheherazade New', 'Amiri', serif;
  font-weight: 700;
  color: #8B7355;
  font-size: 0.95rem;
  z-index: 1;
}

.mushaf-counter {
  margin: 0.4rem;
  padding: 0.4rem 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(197, 168, 130, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.mushaf-counter__progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mushaf-counter__ring {
  position: relative;
  width: 34px;
  height: 34px;
}

.mushaf-counter__ring-svg {
  width: 34px;
  height: 34px;
  transform: rotate(-90deg);
}

.mushaf-counter__ring-track {
  stroke: #e5e7eb;
  stroke-width: 4;
  fill: none;
}

.mushaf-counter__ring-fill {
  stroke-width: 4;
  stroke-linecap: round;
  fill: none;
  transition: stroke-dashoffset 0.4s ease;
}

.mushaf-counter__ring-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.mushaf-counter__check {
  width: 16px;
  height: 16px;
  color: #16a34a;
}

.mushaf-counter__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-left: 0.3rem;
}

.mushaf-counter__label {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 600;
}

.mushaf-counter__bar {
  width: 70px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.mushaf-counter__bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.mushaf-counter__count {
  font-size: 0.6rem;
  color: #94a3b8;
}

.mushaf-counter__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mushaf-counter__reset {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.mushaf-counter__reset:hover {
  background: #e2e8f0;
}

.mushaf-counter__reset-icon {
  width: 14px;
  height: 14px;
}

.mushaf-counter__add {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: none;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.mushaf-counter__add:active {
  transform: scale(0.95);
}

.mushaf-counter__add:disabled {
  color: #9C8868;
  cursor: not-allowed;
}

.mushaf-counter__add-icon {
  width: 20px;
  height: 20px;
}

.mushaf-footer {
  height: 28px;
  border-top: 1px solid #E8DCC8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.75rem;
  color: #B8AF98;
  font-size: 0.7rem;
  font-weight: 700;
}

.mushaf-footer__dots {
  display: flex;
  gap: 0.3rem;
  opacity: 0.5;
}

.mushaf-footer__dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid currentColor;
}

.mushaf-footer__surah {
  font-family: 'Scheherazade New', 'Amiri', serif;
}

.mushaf-legend {
  position: fixed;
  left: 0;
  top: 35%;
  transform: translateY(-50%);
  z-index: 40;
  display: flex;
  align-items: flex-start;
  transition: transform 0.3s ease;
}

.mushaf-legend--expanded {
  transform: translate(0, -50%);
}

.mushaf-legend:not(.mushaf-legend--expanded) {
  transform: translate(calc(-100% + 24px), -50%);
}

.mushaf-legend__panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid #e2e8f0;
  border-radius: 0 14px 14px 0;
  padding: 0.6rem;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
}

.mushaf-legend__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: opacity 0.3s ease;
  max-width: 200px;
}

.mushaf-legend__content--collapsed {
  opacity: 0;
  max-width: 0;
  pointer-events: none;
  position: absolute;
}

.mushaf-legend__title {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.mushaf-legend__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
}

.mushaf-legend__item:active {
  transform: scale(0.98);
}

.mushaf-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.mushaf-legend__label {
  flex: 1;
  white-space: nowrap;
}

.mushaf-legend__count {
  background: #f1f5f9;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  font-size: 0.6rem;
}

.mushaf-legend__toggle {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-left: 0;
  border-radius: 0 12px 12px 0;
  padding: 0.4rem 0.45rem;
  height: 48px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.2s ease;
}

.mushaf-legend__toggle:hover {
  color: #64748b;
}

.mushaf-legend__toggle-icon {
  width: 16px;
  height: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .mushaf-counter__ring-fill,
  .mushaf-counter__bar-fill {
    transition: none;
  }
}
</style>
