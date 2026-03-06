<template>
  <div class="mushaf-page-container min-h-screen pb-[120px] pt-8 px-4 flex flex-col items-center justify-center">
    <div 
      class="mushaf-card relative overflow-hidden bg-[#FEFCF5] shadow-xl mx-auto w-full max-w-[360px] flex flex-col"
      style="aspect-ratio: 1 / 1.6; border-radius: 3px; min-height: 520px;"
    >
      <!-- Top Ornament -->
      <div class="h-2 w-full bg-gradient-to-r from-[#8B7355] via-[#C4A882] to-[#8B7355]"></div>

      <div class="flex-1 p-4 flex flex-col justify-evenly">
        
        <!-- Simulate 4 blocks -->
        <template v-for="b in 4" :key="b">
          <div class="my-1 border-l-4 border-slate-200/50 pl-2">
             <!-- 4 lines for blocks 1-3, 3 lines for block 4 -->
             <div 
                v-for="l in (b === 4 ? 3 : 4)" 
                :key="`b${b}-l${l}`"
                class="h-[18px] bg-slate-200/60 rounded animate-pulse my-[14px]"
                :style="{ 
                  width: l % 4 === 1 ? '70%' : (l % 4 === 2 ? '100%' : (l % 4 === 3 ? '85%' : '95%')), 
                  marginRight: l % 2 === 0 ? 'auto' : '0',
                  marginLeft: l % 2 !== 0 ? 'auto' : '0'
                }"
              ></div>
          </div>
        </template>
        
      </div>

      <!-- Bottom Ornament -->
      <div class="h-1.5 w-full bg-gradient-to-r from-[#8B7355] via-[#C4A882] to-[#8B7355]"></div>
    </div>

    <!-- Skeleton Legends -->
    <div class="mt-6 flex flex-wrap justify-center gap-2 max-w-[360px] animate-pulse">
      <div v-for="i in 4" :key="`leg${i}`" class="h-6 w-24 bg-slate-200/60 rounded flex-shrink-0"></div>
    </div>
  </div>
</template>

<style scoped>
.mushaf-page-container {
  background-color: #E8E0D0; /* Desk surface */
}
</style>
