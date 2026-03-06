<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const navItems = [
    { path: '/', name: 'Quran', icon: '📖' },
    { path: '/progress', name: 'Progress', icon: '📊' },
    { path: '/pengaturan', name: 'Pengaturan', icon: '⚙️' },
];

function isActive(path: string): boolean {
    if (path === '/') return route.path === '/';
    return route.path.startsWith(path);
}

function goTo(path: string): void {
    if (route.path === path) return;
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
            :aria-label="item.name"
            @click="goTo(item.path)"
        >
            <span class="icon" aria-hidden="true">{{ item.icon }}</span>
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
    justify-content: center;
    gap: 0.25rem;
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--muted, #64748b);
    font-size: 0.75rem;
    border-radius: 0.5rem;
    transition: color 0.2s ease, background-color 0.2s ease;
}
.nav-item:hover {
    color: var(--text, #0f172a);
}
.nav-item.active {
    color: #1a7a4a;
    font-weight: 600;
    background: rgba(26, 122, 74, 0.08);
}
.icon {
    font-size: 1.25rem;
    transition: transform 0.2s ease;
}
.nav-item.active .icon {
    transform: scale(1.05);
}
</style>
