import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ReaderView from '../views/ReaderView.vue';
import ProgressView from '../views/ProgressView.vue';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
        meta: { title: 'Quran Tikrar' },
    },
    {
        path: '/reader/:surahNumber',
        name: 'reader',
        component: ReaderView,
        meta: { title: 'Reader' },
        props: true,
    },
    {
        path: '/progress',
        name: 'progress',
        component: ProgressView,
        meta: { title: 'Progress' },
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.afterEach((to) => {
    const title = (to.meta?.title as string) ?? 'Quran Tikrar';
    document.title = title;
});

export default router;
