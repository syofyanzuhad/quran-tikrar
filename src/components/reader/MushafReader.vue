<template>
  <div class="mushaf-reader-wrapper">
    <!-- Loading skeleton -->
    <MushafPageSkeleton v-if="isLoading" />

    <!-- Error state -->
    <MushafErrorState v-else-if="error" :message="error" @retry="goToPage(pageNumber)" />

    <!-- Actual page -->
    <MushafPage
      v-else-if="pageData"
      :page="(pageData as any)"
      :reps="reps"
      :active-block-index="activeBlockIndex"
      :target-reps="targetReps"
      :font-size-scale="fontSizeScale ?? 1"
      @add-rep="$emit('add-rep', $event)"
      @reset-block="$emit('reset-block', $event)"
      @block-tap="$emit('block-tap', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useMushafPage } from '../../composables/useMushafPage'
import MushafPage from './MushafPage.vue'
import MushafPageSkeleton from './MushafPageSkeleton.vue'
import MushafErrorState from './MushafErrorState.vue'

const props = defineProps<{
  pageNumber: number
  reps: number[]
  activeBlockIndex: number
  targetReps: number
  fontSizeScale?: number
}>()

defineEmits<{
  'add-rep': [blockIndex: number]
  'reset-block': [blockIndex: number]
  'block-tap': [blockIndex: number]
}>()

const { pageData, isLoading, error, goToPage } = useMushafPage()

// When parent changes the page number, load new page
watch(() => props.pageNumber, (n) => {
    if (n) {
        goToPage(n)
    }
}, { immediate: true })
</script>

<style scoped>
.mushaf-reader-wrapper {
  width: 100%;
  height: 100%;
}
</style>
