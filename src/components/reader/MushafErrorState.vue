<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  'retry': []
}>()
</script>

<template>
  <div class="mushaf-page-container min-h-screen pb-[120px] pt-8 px-4 flex flex-col items-center justify-center">
    <div 
      class="mushaf-card relative overflow-hidden bg-[#FEFCF5] shadow-xl mx-auto w-full max-w-[360px] flex flex-col items-center justify-center text-center p-8"
      style="aspect-ratio: 1 / 1.6; border-radius: 3px; min-height: 520px; border: 1px solid #E8DCC8;"
    >
      <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 class="text-lg font-bold text-[#3B2A1A] mb-2">Gagal Memuat Halaman</h3>
      <p class="text-sm text-[#8B7355] mb-6">{{ message }}</p>

      <button 
        @click="emit('retry')"
        class="bg-[#8B7355] hover:bg-[#6B5B3E] text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  </div>
</template>

<style scoped>
.mushaf-page-container {
  background-color: #E8E0D0; /* Desk surface */
}
</style>
