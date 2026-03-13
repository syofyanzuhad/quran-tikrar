<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  isDark: boolean;
  isFullscreen: boolean;
}>();

const emit = defineEmits<{
  'toggle-dark': [];
  'toggle-fullscreen': [];
  'prev-page': [];
  'next-page': [];
}>();

const isOpen = ref(false);

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const closeMenu = () => {
  isOpen.value = false;
};

const handleAction = (action: 'dark' | 'fullscreen' | 'prev' | 'next') => {
  switch (action) {
    case 'dark':
      emit('toggle-dark');
      break;
    case 'fullscreen':
      emit('toggle-fullscreen');
      break;
    case 'prev':
      emit('prev-page');
      break;
    case 'next':
      emit('next-page');
      break;
  }
  closeMenu();
};
</script>

<template>
  <div class="fab-container">
    <!-- Backdrop for closing when clicking outside -->
    <div 
      v-if="isOpen" 
      class="fab-backdrop" 
      @click="closeMenu"
    ></div>

    <div class="fab-menu" :class="{ 'fab-menu--open': isOpen }">
      <!-- Action Buttons -->
      <div class="fab-actions" :class="{ 'fab-actions--open': isOpen }">
        
        <!-- Previous Page -->
        <button 
          class="fab-btn fab-btn--action shadow-md" 
          @click="handleAction('prev')"
          aria-label="Halaman Sebelumnya"
          title="Halaman Sebelumnya"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <!-- Next Page -->
        <button 
          class="fab-btn fab-btn--action shadow-md" 
          @click="handleAction('next')"
          aria-label="Halaman Selanjutnya"
          title="Halaman Selanjutnya"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        <!-- Fullscreen Toggle -->
        <button 
          class="fab-btn fab-btn--action shadow-md" 
          @click="handleAction('fullscreen')"
          :aria-label="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
          :title="isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'"
        >
          <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"></path></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"></path></svg>
        </button>

        <!-- Dark Mode Toggle -->
        <button 
          class="fab-btn fab-btn--action shadow-md" 
          @click="handleAction('dark')"
          :aria-label="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          :title="isDark ? 'Mode Terang' : 'Mode Gelap'"
        >
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

      </div>

      <!-- Main Toggle Button -->
      <button 
        class="fab-btn fab-btn--main shadow-lg" 
        @click="toggleMenu"
        :aria-label="isOpen ? 'Tutup Menu' : 'Buka Menu'"
      >
        <svg v-if="isOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>

    </div>
  </div>
</template>

<style scoped>
.fab-container {
  position: fixed;
  bottom: 5.5rem; /* Above the bottom nav */
  right: 1.25rem;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fab-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background-color: transparent;
}

.fab-menu {
  position: relative;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fab-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  opacity: 0;
  visibility: hidden;
  transform: translateY(20px) scale(0.8);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}

.fab-actions--open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.fab-btn {
  border: none;
  background: var(--surface, #ffffff);
  color: var(--text, #1f2937);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.fab-btn:active {
  transform: scale(0.92);
}

.fab-btn--main {
  width: 3.25rem;
  height: 3.25rem;
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e2e8f0);
}

.fab-btn--action {
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--border, #e2e8f0);
}

.fab-btn--action:hover {
  background: var(--bg-hover, #f8fafc);
}

@media (prefers-reduced-motion: reduce) {
  .fab-actions {
    transition: opacity 0.2s ease;
    transform: none;
  }
  .fab-btn {
    transition: none;
  }
}
</style>
