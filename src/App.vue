<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import BottomNav from './components/ui/BottomNav.vue';
import OfflineBanner from './components/ui/OfflineBanner.vue';
import { useQuran } from './composables/useQuran';

const { initializeDatabase, isLoading: isSeeding, seedProgress } = useQuran();

onMounted(() => {
    initializeDatabase();
});
</script>

<template>
    <div class="app">
        <OfflineBanner />
        <div v-if="isSeeding" class="seed-overlay">
            <p class="seed-text">Downloading Quran for offline use...</p>
            <p class="seed-progress">{{ seedProgress }}%</p>
        </div>
        <template v-else>
            <main class="main">
                <RouterView />
            </main>
            <BottomNav />
        </template>
    </div>
</template>

<style scoped>
.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}
.main {
    flex: 1;
    padding-bottom: 4rem;
}
.seed-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 0.5rem;
}
.seed-text {
    margin: 0;
    font-size: 1rem;
}
.seed-progress {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
}
</style>
