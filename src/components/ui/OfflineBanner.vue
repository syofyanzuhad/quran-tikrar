<script setup lang="ts">
import { ref, watch } from 'vue';
import { useOfflineStatus } from '../../composables/useOfflineStatus';
import { useQuran } from '../../composables/useQuran';

const { isOnline, isUpdateAvailable, promptUpdate } = useOfflineStatus();
const { isLoading: isSeeding } = useQuran();

const showSavedOffline = ref(false);
const wasSeeding = ref(false);
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

watch(isSeeding, (seeding) => {
    if (wasSeeding.value && !seeding) {
        showSavedOffline.value = true;
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            showSavedOffline.value = false;
            hideTimeout = null;
        }, 4000);
    }
    wasSeeding.value = seeding;
});
</script>

<template>
    <div class="fixed left-0 right-0 top-0 z-50 flex flex-col gap-0">
        <!-- Offline banner -->
        <div
            v-if="!isOnline"
            class="flex items-center justify-center gap-2 bg-slate-700 px-4 py-2 text-sm font-medium text-white"
        >
            <span aria-hidden="true">📴</span>
            <span>Mode Offline</span>
        </div>

        <!-- Saved offline (after seed) -->
        <Transition name="banner">
            <div
                v-if="showSavedOffline"
                class="flex items-center justify-center gap-2 bg-[#1a7a4a] px-4 py-2 text-sm font-medium text-white"
            >
                <span aria-hidden="true">✅</span>
                <span>Tersimpan Offline</span>
            </div>
        </Transition>

        <!-- Update available snackbar -->
        <Transition name="snackbar">
            <div
                v-if="isUpdateAvailable"
                class="mx-4 mt-2 flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white shadow-lg"
            >
                <span class="flex items-center gap-2">
                    <span aria-hidden="true">🔄</span>
                    <span>Update tersedia</span>
                </span>
                <button
                    type="button"
                    class="shrink-0 rounded-lg bg-[#1a7a4a] px-4 py-2 font-semibold text-white transition active:scale-[0.98]"
                    @click="promptUpdate()"
                >
                    Perbarui
                </button>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.banner-enter-active,
.banner-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}
.banner-enter-from,
.banner-leave-to {
    opacity: 0;
    transform: translateY(-100%);
}

.snackbar-enter-active,
.snackbar-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}
.snackbar-enter-from,
.snackbar-leave-to {
    opacity: 0;
    transform: translateY(-1rem);
}
</style>
