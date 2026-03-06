<script setup lang="ts">
import { computed } from 'vue'
import type { TikrarBlockUI } from '../../types/reader'
import { BLOCK_COLORS } from '../../constants/blockColors'

// Fallback interface for Ayah in case it's not defined elsewhere
export interface Ayah {
  arabic?: string
  text?: string
  translation?: string
  [key: string]: any
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
}>()

const emit = defineEmits<{
  'add-rep': [blockIndex: number]
  'reset-block': [blockIndex: number]
  'block-tap': [blockIndex: number]
}>()

const progressPercentage = computed(() => {
  if (!props.blocks || props.blocks.length === 0) return 0
  const totalReps = props.blocks.length * props.targetReps
  const currentTotal = props.reps.reduce((sum, curr) => sum + Math.min(curr, props.targetReps), 0)
  return Math.round((currentTotal / totalReps) * 100)
})

const isDone = (index: number) => props.reps[index] >= props.targetReps
const isActive = (index: number) => props.activeBlockIndex === index

const strokeDasharray = 2 * Math.PI * 24

const getRingStrokeDashoffset = (rep: number, target: number) => {
  const cappedRep = Math.min(rep, target)
  const progress = cappedRep / target
  return strokeDasharray - progress * strokeDasharray
}
</script>

<template>
  <div class="min-h-screen bg-[#f8fafc] pb-24 font-sans text-slate-800">
    <!-- Sticky Header -->
    <header class="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-sm px-4 py-3 border-b border-slate-200">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h1 class="text-xl font-bold font-arabic">{{ surahNameArabic }}</h1>
          <p class="text-xs text-slate-500">Halaman {{ pageNumber }}</p>
        </div>
        <div class="text-3xl font-bold text-green-600">
          {{ progressPercentage }}%
        </div>
      </div>
      
      <!-- Progress Pill Dots -->
      <div class="flex gap-1 h-1.5 w-full">
        <div 
          v-for="(block, i) in blocks" 
          :key="block.index"
          class="rounded-full transition-all duration-300 h-full"
          :class="[isActive(i) || isDone(i) ? 'flex-1' : 'w-4', !isActive(i) && !isDone(i) ? 'bg-slate-200' : '']"
          :style="{ backgroundColor: (isActive(i) || isDone(i)) ? BLOCK_COLORS[block.index].border : undefined }"
        ></div>
      </div>
    </header>

    <div class="p-4 space-y-4">
      <!-- Blocks -->
      <div 
        v-for="(block, i) in blocks" 
        :key="block.index"
        class="transition-all duration-500 ease-in-out cursor-pointer rounded-2xl bg-white relative overflow-hidden"
        :class="[
          isActive(i) ? 'shadow-lg z-10 scale-[1.008]' : 'shadow-sm hover:shadow-md',
          !isActive(i) && isDone(i) ? 'opacity-65' : ''
        ]"
        :style="{
          backgroundColor: BLOCK_COLORS[block.index].bg,
          borderLeft: `3px solid ${BLOCK_COLORS[block.index].border}`,
          boxShadow: isActive(i) ? `0 4px 20px ${BLOCK_COLORS[block.index].border}30` : undefined
        }"
        @click="emit('block-tap', i)"
      >
        <div class="p-4">
          <!-- Block Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: BLOCK_COLORS[block.index].border }"></span>
              <span class="text-[10px] font-bold tracking-wider uppercase" :style="{ color: BLOCK_COLORS[block.index].accent }">
                {{ block.labelLatin }}
              </span>
            </div>
            <div v-if="isDone(i)" class="text-xs font-semibold px-2 py-1 rounded-md text-green-700 bg-green-100 flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
              Selesai
            </div>
          </div>

          <!-- Arabic Text -->
          <div 
            class="text-[20px] leading-[2.2] text-right break-words" 
            dir="rtl"
            style="font-family: 'Scheherazade New', 'Amiri', serif;"
          >
            <span v-for="ayahId in block.ayahIds" :key="ayahId" class="inline">
              {{ ayahsMap[ayahId]?.arabic || ayahsMap[ayahId]?.text || 'Teks Arab tidak tersedia' }}
              <span 
                class="inline-flex items-center justify-center w-6 h-6 rounded-full mx-1 text-xs font-sans font-bold translate-y-[-2px]"
                :style="{ backgroundColor: BLOCK_COLORS[block.index].soft, color: BLOCK_COLORS[block.index].accent }"
              >
                {{ ayahId }}
              </span>
            </span>
          </div>
          
          <div v-if="showTranslation" class="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-200/50 pt-3 text-left">
             <div v-for="ayahId in block.ayahIds" :key="'trans'+ayahId" class="mb-2">
               <span class="font-semibold text-slate-400 mr-1">{{ ayahId }}.</span>
               <span v-html="ayahsMap[ayahId]?.translation || 'Terjemahan tidak tersedia.'"></span>
             </div>
          </div>
        </div>

        <!-- Counter Section (Only in active block) -->
        <div v-if="isActive(i)" class="px-4 pb-4 delay-100 animate-in fade-in zoom-in-95 duration-300">
          <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center justify-between mt-2">
            
            <div class="flex items-center gap-3">
              <!-- SVG Ring Progress -->
              <div class="relative w-[56px] h-[56px] flex items-center justify-center">
                <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 56 56">
                  <!-- Custom Track -->
                  <circle cx="28" cy="28" r="24" stroke="#e5e7eb" stroke-width="4" fill="none" />
                  <!-- Progress Fill -->
                  <circle 
                    cx="28" cy="28" r="24" 
                    fill="none" 
                    stroke-width="4" 
                    stroke-linecap="round"
                    class="transition-all duration-500 ease-out"
                    :stroke="BLOCK_COLORS[block.index].border"
                    :stroke-dasharray="strokeDasharray"
                    :stroke-dashoffset="getRingStrokeDashoffset(reps[i], targetReps)"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center font-bold text-lg text-slate-700">
                  <template v-if="isDone(i)">
                    <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                  </template>
                  <template v-else>
                    {{ reps[i] }}
                  </template>
                </div>
              </div>

              <!-- Counter Info -->
              <div class="flex flex-col text-left">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pengulangan</span>
                <span class="font-medium text-slate-700">
                  <strong class="text-xl">{{ reps[i] }}</strong> 
                  <span class="text-slate-400"> / {{ targetReps }}x</span>
                </span>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex flex-col justify-center items-center gap-2">
              <button 
                @click.stop="emit('add-rep', i)"
                class="p-0 w-[42px] h-[42px] rounded-[11px] flex items-center justify-center transition-all active:scale-95"
                :class="isDone(i) ? 'bg-slate-200 text-slate-400 shadow-none' : 'text-white'"
                :style="!isDone(i) ? { 
                  backgroundColor: BLOCK_COLORS[block.index].border,
                  boxShadow: `0 3px 10px ${BLOCK_COLORS[block.index].border}44`
                } : {}"
                :disabled="isDone(i)"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
              </button>
              
              <button 
                v-if="reps[i] > 0"
                @click.stop="emit('reset-block', i)"
                class="text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors px-2"
              >
                Reset
              </button>
            </div>
            
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>
