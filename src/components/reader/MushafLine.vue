<script setup lang="ts">
import type { MushafLine } from '../../types/quran'
import type { BlockColor } from '../../types/reader'

const props = defineProps<{
  line: MushafLine
  blockColor: BlockColor
  isActiveBlock: boolean
  fontSizeScale: number
}>()

const toEasternArabic = (num: number) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().replace(/\d/g, (d) => digits[parseInt(d, 10)] ?? d)
}
</script>

<template>
  <div
    class="mushaf-line"
    :class="{
      'mushaf-line--center': line.isBismillah || line.words.length < 3,
      'mushaf-line--between': !line.isBismillah && line.words.length >= 3
    }"
    :style="{
      color: blockColor.mushafInk || 'var(--mushaf-ink-color, #1A1209)',
      fontSize: `calc(var(--mushaf-font-size, 18px) * ${fontSizeScale})`,
      lineHeight: '38px',
      direction: 'rtl'
    }"
  >
    <span
      v-for="word in line.words"
      :key="word.id"
      class="mushaf-word"
    >
      <template v-if="word.charType === 'end'">
        <span
          class="ayah-end-marker"
          :style="{
            color: '#5C4A2A',
            fontSize: `calc(14px * ${fontSizeScale})`,
            margin: '0 4px',
            fontFamily: 'system-ui, sans-serif'
          }"
        >
          <span class="ayah-end-marker__symbol">۝</span>
          <span class="ayah-end-marker__number" dir="ltr">{{ toEasternArabic(word.verseNumber) }}</span>
        </span>
      </template>

      <template v-else>
        {{ word.textUthmani }}
      </template>
    </span>
  </div>
</template>

<style scoped>
.mushaf-line {
  display: flex;
  width: 100%;
  direction: rtl;
  font-family: 'KFGQPC Uthmanic Hafs', 'Scheherazade New', 'Amiri', serif;
}

.mushaf-line--center {
  justify-content: center;
}

.mushaf-line--between {
  justify-content: space-between;
}

.mushaf-word {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  gap: 0.1em;
}

.ayah-end-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transform: translateY(2px);
}

.ayah-end-marker__symbol {
  position: absolute;
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  font-family: 'KFGQPC Uthmanic Hafs', 'Scheherazade New', 'Amiri', serif;
}

.ayah-end-marker__number {
  position: relative;
  z-index: 1;
  font-size: 10px;
  font-weight: 700;
  margin-top: 2px;
}

@media (min-width: 640px) {
  .ayah-end-marker__number {
    font-size: 11px;
  }
}
</style>
