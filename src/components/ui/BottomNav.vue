<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const navItems = [
    { path: '/', name: 'Home', icon: '🏠' },
    { path: '/progress', name: 'Progress', icon: '📊' },
];

const isActive = (path: string) => {
    if (path === '/') return route.path === '/';
    return route.path.startsWith(path);
};

function goTo(path: string) {
    router.push(path);
}
</script>

<template>
    <nav class="bottom-nav">
        <button
            v-for="item in navItems"
            :key="item.path"
            type="button"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="goTo(item.path)"
        >
            <span class="icon">{{ item.icon }}</span>
            <span class="label">{{ item.name }}</span>
        </button>
    </nav>
</template>

<style scoped>
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    padding: 0.5rem 0;
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
    background: var(--nav-bg, #fff);
    border-top: 1px solid var(--border, #e2e8f0);
    z-index: 100;
}
.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--muted, #64748b);
    font-size: 0.75rem;
    border-radius: 0.5rem;
}
.nav-item:hover {
    color: var(--text, #0f172a);
}
.nav-item.active {
    color: var(--accent, #0d9488);
    font-weight: 600;
}
.icon {
    font-size: 1.25rem;
}
</style>
