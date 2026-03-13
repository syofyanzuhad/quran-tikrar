<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  'retry': []
}>()
</script>

<template>
  <div class="mushaf-error">
    <div class="mushaf-error__card">
      <div class="mushaf-error__icon">
        <svg class="mushaf-error__icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      </div>
      <h3 class="mushaf-error__title">Gagal Memuat Halaman</h3>
      <p class="mushaf-error__message">{{ message }}</p>

      <button
        type="button"
        class="mushaf-error__button"
        @click="emit('retry')"
      >
        Coba Lagi
      </button>
    </div>
  </div>
</template>

<style scoped>
.mushaf-error {
  min-height: 100vh;
  padding: 2rem 1rem 7.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #E8E0D0;
}

.mushaf-error__card {
  width: 100%;
  max-width: 360px;
  min-height: 520px;
  background: #FEFCF5;
  border-radius: 3px;
  border: 1px solid #E8DCC8;
  box-shadow: 2px 3px 0 #C8BFA8, 4px 6px 0 #B8AF98, 0 8px 32px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.mushaf-error__icon {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: #FEF2F2;
  color: #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.mushaf-error__icon-svg {
  width: 32px;
  height: 32px;
}

.mushaf-error__title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 800;
  color: #3B2A1A;
}

.mushaf-error__message {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  color: #8B7355;
}

.mushaf-error__button {
  border: none;
  background: #8B7355;
  color: #fff;
  padding: 0.65rem 1.6rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.mushaf-error__button:hover {
  background: #6B5B3E;
}
</style>
