<template>
  <div class="mushaf-skeleton">
    <div class="mushaf-skeleton__card">
      <div class="mushaf-skeleton__ornament"></div>
      <div class="mushaf-skeleton__lines">
        <div
          v-for="i in 15"
          :key="i"
          class="mushaf-skeleton__line"
          :style="{ width: i % 3 === 0 ? '75%' : (i % 2 === 0 ? '90%' : '100%') }"
        ></div>
      </div>
      <div class="mushaf-skeleton__ornament"></div>
    </div>

    <div class="mushaf-skeleton__legend">
      <div v-for="i in 4" :key="`leg${i}`" class="mushaf-skeleton__legend-item"></div>
    </div>
  </div>
</template>

<style scoped>
.mushaf-skeleton {
  min-height: 100vh;
  padding: 2rem 1rem 7.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  background-color: #E8E0D0;
}

.mushaf-skeleton__card {
  width: 100%;
  max-width: 360px;
  background: #FEFCF5;
  border-radius: 3px;
  box-shadow: 2px 3px 0 #C8BFA8, 4px 6px 0 #B8AF98, 0 8px 32px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  aspect-ratio: 1 / 1.6;
}

.mushaf-skeleton__ornament {
  height: 6px;
  background: linear-gradient(to right, #8B7355, #C4A882, #8B7355);
}

.mushaf-skeleton__lines {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.mushaf-skeleton__line {
  height: 18px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.3);
  animation: pulse 1.6s ease-in-out infinite;
  margin: 10px 0;
}

.mushaf-skeleton__legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  max-width: 360px;
  animation: pulse 1.6s ease-in-out infinite;
}

.mushaf-skeleton__legend-item {
  height: 24px;
  width: 96px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
}
</style>
