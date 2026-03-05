<script setup lang="ts">
import { RouterView } from 'vue-router';
import BottomNav from './components/ui/BottomNav.vue';
</script>

<template>
    <div class="app">
        <main class="main">
            <RouterView />
        </main>
        <BottomNav />
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
</style>
