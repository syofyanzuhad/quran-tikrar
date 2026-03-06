<script setup lang="ts">
import { onMounted } from 'vue'
import type { MushafPage } from '../../types/quran'
import { BLOCK_COLORS } from '../../constants/blockColors'
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

// Progress calculations
const strokeDasharray = 2 * Math.PI * 16 // r=16 for a 40px circle (stroke=4)
const getRingStrokeDashoffset = (rep: number, target: number) => {
  const cappedRep = Math.min(rep, target)
  const progress = cappedRep / target
  return strokeDasharray - progress * strokeDasharray
}

const isDone = (index: number) => (props.reps[index] || 0) >= props.targetReps

const arabicBlockNumbers = ['١', '٢', '٣', '٤']

</script>

<template>
  <div class="mushaf-page-container min-h-screen pb-[120px] pt-8 px-4 flex flex-col items-center">
    
    <!-- Skeleton loader for page -->
    <div 
      v-if="!page" 
      class="mushaf-card relative overflow-hidden bg-[#FEFCF5] shadow-xl mx-auto w-full max-w-[340px] flex flex-col"
      style="aspect-ratio: 1 / 1.6; border-radius: 3px;"
    >
      <div class="h-2 w-full bg-gradient-to-r from-[#8B7355] via-[#C4A882] to-[#8B7355]"></div>
      <div class="flex-1 p-4 flex flex-col justify-evenly">
        <div 
          v-for="i in 15" 
          :key="i"
          class="h-4 bg-slate-200/60 rounded animate-pulse"
          :style="{ width: i % 3 === 0 ? '75%' : (i % 2 === 0 ? '90%' : '100%'), alignSelf: 'flex-start' }"
        ></div>
      </div>
      <div class="h-1.5 w-full bg-gradient-to-r from-[#8B7355] via-[#C4A882] to-[#8B7355]"></div>
    </div>

    <!-- Real Page -->
    <div 
      v-else
      class="mushaf-card relative overflow-hidden shadow-xl mx-auto w-full max-w-[360px] flex flex-col bg-[#FEFCF5]"
      style="border-radius: 3px; box-shadow: 2px 3px 0 #C8BFA8, 4px 6px 0 #B8AF98, 0 8px 32px rgba(0,0,0,0.18); min-height: 520px;"
    >
      <!-- Top Ornament -->
      <div class="h-2 w-full bg-gradient-to-r from-[#8B7355] via-[#C4A882] to-[#8B7355]"></div>

      <!-- Header: Basmala or Surah Name -->
      <div class="py-1 px-4 flex items-center justify-center font-bold text-[#8B7355] text-sm font-arabic border-b border-[#E8DCC8]">
        {{ page.surahNameArabic }}
      </div>

      <!-- Blocks Wrapper -->
      <div class="flex-1 flex flex-col">
        <template v-for="block in page.blocks" :key="block.blockIndex">
          
          <!-- Block section -->
          <div 
            class="relative flex-1 flex flex-col transition-colors duration-500 cursor-pointer"
            :class="{
              'active-block': activeBlockIndex === block.blockIndex,
              'done-block': activeBlockIndex !== block.blockIndex && isDone(block.blockIndex),
              'pending-block': activeBlockIndex !== block.blockIndex && !isDone(block.blockIndex),
              'pl-1': activeBlockIndex === block.blockIndex
            }"
            :style="{
              backgroundColor: 
                activeBlockIndex === block.blockIndex ? (BLOCK_COLORS[block.blockIndex]?.mushafBg || '#FFF8E7') : 
                (isDone(block.blockIndex) ? '#F8F5EE' : '#FEFCF5'),
              borderLeft: `5px solid ${activeBlockIndex === block.blockIndex ? (BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842') : (isDone(block.blockIndex) ? (BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842') + '66' : '#E8DCC8')}`,
              borderBottom: block.blockIndex < 3 ? `1px dashed ${(BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842')}44` : 'none',
              paddingRight: '6px'
            }"
            @click="emit('block-tap', block.blockIndex)"
          >
            <!-- Background Texture for active block (subtle horizontal lines) -->
            <div 
              v-if="activeBlockIndex === block.blockIndex"
              class="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply"
              style="background-image: repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.05) 31px, rgba(0,0,0,0.05) 32px);"
            ></div>

            <div 
              class="absolute top-2 left-0 w-[20px] h-[18px] flex items-center justify-center rounded-r transition-colors shadow-sm z-10"
              :style="{
                backgroundColor: activeBlockIndex === block.blockIndex || isDone(block.blockIndex) ? (BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842') : '#E8DCC8',
                color: activeBlockIndex === block.blockIndex || isDone(block.blockIndex) ? '#FFF' : '#9C8868',
                fontSize: '12px'
              }"
            >
              {{ arabicBlockNumbers[block.blockIndex] }}
            </div>

            <!-- Lines (v-memo for performance) -->
            <div class="flex-1 flex flex-col pl-4 pt-1 z-10 relative">
              <MushafLine
                v-for="line in block.lines"
                :key="line.lineNumber"
                :line="line"
                :blockColor="BLOCK_COLORS[block.blockIndex] || BLOCK_COLORS[0]!"
                :isActiveBlock="activeBlockIndex === block.blockIndex"
                :fontSizeScale="fontSizeScale"
                v-memo="[activeBlockIndex === block.blockIndex, isDone(block.blockIndex), fontSizeScale]"
                :style="{
                  opacity: activeBlockIndex !== block.blockIndex && isDone(block.blockIndex) ? 0.75 : 1
                }"
              />
            </div>

            <!-- Tikrar Counter Strip (Only for active block) -->
            <div 
              v-if="activeBlockIndex === block.blockIndex"
              class="mushaf-counter-strip relative z-20 m-1.5 px-3 py-1.5 rounded-lg flex items-center justify-between"
              :style="{
                backgroundColor: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${BLOCK_COLORS[block.blockIndex]?.mushafBorder}33`,
                boxShadow: `0 2px 12px ${BLOCK_COLORS[block.blockIndex]?.mushafBorder}15`
              }"
              @click.stop
            >
              <div class="flex items-center gap-2">
                <div class="relative w-[34px] h-[34px] flex items-center justify-center">
                  <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" stroke="#e5e7eb" stroke-width="4" fill="none" />
                    <circle 
                      cx="20" cy="20" r="16" 
                      fill="none" 
                      stroke-width="4" 
                      stroke-linecap="round"
                      class="transition-all duration-500 ease-out fill-transparent"
                      :stroke="BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842'"
                      :stroke-dasharray="strokeDasharray"
                      :stroke-dashoffset="getRingStrokeDashoffset(reps[block.blockIndex] || 0, targetReps)"
                    />
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center font-bold text-sm" :style="{ color: BLOCK_COLORS[block.blockIndex]?.mushafInk || '#1A1209' }">
                    <template v-if="isDone(block.blockIndex)">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-600 stroke-current" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                    </template>
                    <template v-else>
                      {{ reps[block.blockIndex] }}
                    </template>
                  </div>
                </div>

                <div class="flex flex-col ml-1">
                  <span class="text-[11px] text-slate-500 font-medium">Blok {{ block.blockIndex + 1 }}</span>
                  <div class="flex items-center gap-1.5 mt-0.5 w-[70px]">
                    <div class="h-1 bg-slate-200 rounded-full flex-1 overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-300" :style="{ width: `${Math.min(100, ((reps[block.blockIndex] || 0) / targetReps) * 100)}%`, backgroundColor: BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842' }"></div>
                    </div>
                  </div>
                  <span class="text-[9px] text-slate-400 mt-0.5">{{ reps[block.blockIndex] }}/{{ targetReps }} kali</span>
                </div>
              </div>

              <!-- Controls -->
              <div class="flex items-center gap-2 shrink-0">
                <button 
                  v-if="(reps[block.blockIndex] || 0) > 0"
                  @click.stop="emit('reset-block', block.blockIndex)"
                  class="shrink-0 p-0 w-[26px] h-[26px] rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg>
                </button>
                <button 
                  @click.stop="emit('add-rep', block.blockIndex)"
                  class="shrink-0 p-0 w-[36px] h-[36px] rounded-[9px] flex items-center justify-center transition-all active:scale-95"
                  :class="isDone(block.blockIndex) ? 'text-[#9C8868]' : 'text-white'"
                  :style="{ backgroundColor: isDone(block.blockIndex) ? '#E8DCC8' : (BLOCK_COLORS[block.blockIndex]?.mushafBorder || '#F5C842') }"
                  :disabled="isDone(block.blockIndex)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4.5v15m7.5-7.5h-15"></path></svg>
                </button>
              </div>
            </div>

          </div>
        </template>
      </div>

      <!-- Footer: Hal X | markers | Surah Name -->
      <div class="h-7 border-t border-[#E8DCC8] flex items-center justify-between px-3 text-[#B8AF98] text-[11px] font-bold">
        <span>HAL. {{ page.pageNumber }}</span>
        <div class="flex gap-1.5 opacity-50">
          <span class="w-1.5 h-1.5 rounded-full border border-current"></span>
          <span class="w-1.5 h-1.5 rounded-full border border-current"></span>
          <span class="w-1.5 h-1.5 rounded-full border border-current"></span>
          <span class="w-1.5 h-1.5 rounded-full border border-current"></span>
        </div>
        <span class="font-arabic">{{ page.surahNameArabic }}</span>
      </div>

      <!-- Bottom Ornament -->
      <div class="h-1.5 w-full bg-gradient-to-r from-[#8B7355] via-[#C4A882] to-[#8B7355]"></div>
    </div>

    <!-- Page Wrapper Legend -->
    <div v-if="page" class="mt-6 flex flex-wrap justify-center gap-2 max-w-[360px]">
      <div
        v-for="block in page.blocks"
        :key="'legend-'+block.blockIndex"
        class="text-[11px] font-bold px-2 py-1 rounded-md border flex items-center gap-1.5"
        :style="{
          backgroundColor: activeBlockIndex === block.blockIndex ? '#FFF' : 'transparent',
          borderColor: activeBlockIndex === block.blockIndex ? (BLOCK_COLORS[block.blockIndex]?.border || '#C8BFA8') : '#C8BFA8',
          color: activeBlockIndex === block.blockIndex ? (BLOCK_COLORS[block.blockIndex]?.accent || '#9C8868') : '#9C8868'
        }"
        @click="emit('block-tap', block.blockIndex)"
      >
        <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: BLOCK_COLORS[block.blockIndex]?.border || '#C8BFA8' }"></span>
        Blok {{ block.blockIndex + 1 }}: {{ reps[block.blockIndex] }}/{{ targetReps }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.mushaf-page-container {
  background-color: #E8E0D0; /* Desk surface */
}
</style>
