import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ReaderView from '../views/ReaderView.vue';
import ProgressView from '../views/ProgressView.vue';
import SettingsView from '../views/SettingsView.vue';

const APP_NAME = 'Quran Tikrar';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
        meta: { title: 'Hafal Al-Quran Offline' },
    },
    {
        path: '/baca/:page',
        name: 'reader',
        component: ReaderView,
        meta: { title: 'Baca Halaman' },
        props: true,
    },
    {
        path: '/progress',
        name: 'progress',
        component: ProgressView,
        meta: { title: 'Progress Hafalan' },
    },
    {
        path: '/pengaturan',
        name: 'settings',
        component: SettingsView,
        meta: { title: 'Pengaturan' },
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.afterEach((to) => {
    const base = (to.meta?.title as string) ?? APP_NAME;
    // For reader pages, append the page number
    if (to.name === 'reader' && to.params.page) {
        document.title = `${base} ${to.params.page} — ${APP_NAME}`;
    } else {
        document.title = `${base} — ${APP_NAME}`;
    }
});

export default router;
