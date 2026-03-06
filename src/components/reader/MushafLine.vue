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
    class="mushaf-line flex rtl w-full"
    :class="{ 
      'justify-center': line.isBismillah || line.words.length < 3, 
      'justify-between': !line.isBismillah && line.words.length >= 3 
    }"
    :style="{ 
      color: blockColor.mushafInk || 'var(--mushaf-ink-color, #1A1209)',
      fontSize: `calc(var(--mushaf-font-size, 18px) * ${fontSizeScale})`,
      lineHeight: '38px', // Fixed absolute line height across the 15 lines
      direction: 'rtl'
    }"
  >
    <span 
      v-for="word in line.words" 
      :key="word.id"
      class="mushaf-word whitespace-nowrap inline-flex items-center"
    >
      <template v-if="word.charType === 'end'">
        <span 
          class="ayah-end-marker inline-flex items-center justify-center relative translate-y-[2px]"
          :style="{ 
            color: '#5C4A2A', 
            fontSize: `calc(14px * ${fontSizeScale})`,
            margin: '0 4px',
            fontFamily: 'system-ui, sans-serif'
          }"
        >
          <span class="absolute text-[22px] font-normal leading-none" style="font-family: 'KFGQPC Uthmanic Hafs', 'Scheherazade New', 'Amiri'">۝</span>
          <span class="z-10 text-[10px] sm:text-[11px] font-bold mt-0.5" dir="ltr">{{ toEasternArabic(word.verseNumber) }}</span>
        </span>
      </template>

      <!-- All other words (word, pause, sajdah) -->
      <template v-else>
        {{ word.textUthmani }}
      </template>
    </span>
  </div>
</template>

<style scoped>
.mushaf-line {
  font-family: 'KFGQPC Uthmanic Hafs', 'Scheherazade New', 'Amiri', serif;
}
.mushaf-word {
  /* Provide a smooth gap if justify-between isn't enough, else mostly flexible */
  gap: 0.1em;
}
</style>
