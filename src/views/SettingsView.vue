<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useQuran } from '../composables/useQuran';
import {
    useSettings,
    SETTINGS_KEY,
    type SettingsState,
    type TargetRepsPreset,
    type ArabFontSize,
} from '../composables/useSettings';
import { db } from '../db';
import type { StoredHafalanProgress, StoredTikrarSession } from '../db';

const settings = inject<SettingsState>(SETTINGS_KEY) ?? useSettings();

const { initializeDatabase, getDownloadedPageCount, downloadRemainingPages, downloadJuz, seedProgress } = useQuran();

const storageUsageMb = ref<number | null>(null);
const storageStatus = ref<'loading' | 'ready' | 'empty'>('loading');
const downloadedCount = ref<number | null>(null);
const isDownloadingRemaining = ref(false);
const isDownloadingJuz = ref(false);
const selectedJuz = ref(1);
const TOTAL_MUSHAF_PAGES = 604;
const JUZ_OPTIONS = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: `Juz ${i + 1}` }));
const resetConfirmText = ref('');
const showResetConfirm = ref(false);
const showClearCacheConfirm = ref(false);
const isExporting = ref(false);
const isClearing = ref(false);
const isResetting = ref(false);

const TARGET_PRESETS: { label: string; preset: TargetRepsPreset }[] = [
    { label: '7×', preset: '7' },
    { label: '10×', preset: '10' },
    { label: '20×', preset: '20' },
    { label: '40×', preset: '40' },
    { label: 'Custom', preset: 'custom' },
];

const FONT_OPTIONS: { label: string; value: ArabFontSize }[] = [
    { label: 'Kecil', value: 'small' },
    { label: 'Sedang', value: 'medium' },
    { label: 'Besar', value: 'large' },
    { label: 'Sangat Besar', value: 'xlarge' },
];

const previewTargetText = computed(
    () => `Setiap blok akan diulang ${settings.targetReps.value} kali sebelum lanjut`
);

async function updateStorageInfo(): Promise<void> {
    storageStatus.value = 'loading';
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const est = await navigator.storage.estimate();
            const bytes = est.usage ?? 0;
            storageUsageMb.value = Math.round((bytes / (1024 * 1024)) * 10) / 10;
        } else {
            storageUsageMb.value = null;
        }
        const count = await db.ayahs.count();
        storageStatus.value = count > 0 ? 'ready' : 'empty';
        downloadedCount.value = await getDownloadedPageCount();
    } catch {
        storageStatus.value = 'empty';
        downloadedCount.value = null;
    }
}

async function startDownloadRemaining(): Promise<void> {
    if (isDownloadingRemaining.value) return;
    isDownloadingRemaining.value = true;
    try {
        await downloadRemainingPages();
        await updateStorageInfo();
    } finally {
        isDownloadingRemaining.value = false;
    }
}

async function startDownloadJuz(): Promise<void> {
    if (isDownloadingJuz.value) return;
    isDownloadingJuz.value = true;
    try {
        await downloadJuz(selectedJuz.value);
        await updateStorageInfo();
    } finally {
        isDownloadingJuz.value = false;
    }
}

function setTargetPreset(preset: TargetRepsPreset): void {
    settings.targetRepsPreset.value = preset;
}

async function exportProgress(): Promise<void> {
    isExporting.value = true;
    try {
        const [hafalan, sessions] = await Promise.all([
            db.hafalanProgress.toArray(),
            db.tikrarSessions.toArray(),
        ]);
        const payload = {
            exportedAt: new Date().toISOString(),
            hafalanProgress: hafalan as unknown as StoredHafalanProgress[],
            tikrarSessions: sessions as unknown as StoredTikrarSession[],
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quran-tikrar-progress-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } finally {
        isExporting.value = false;
    }
}

function openResetConfirm(): void {
    resetConfirmText.value = '';
    showResetConfirm.value = true;
}

function closeResetConfirm(): void {
    showResetConfirm.value = false;
    resetConfirmText.value = '';
}

const canReset = computed(() => resetConfirmText.value.trim() === 'RESET');

async function confirmReset(): Promise<void> {
    if (!canReset.value) return;
    isResetting.value = true;
    try {
        await db.hafalanProgress.clear();
        await db.tikrarSessions.clear();
        closeResetConfirm();
        await updateStorageInfo();
    } finally {
        isResetting.value = false;
    }
}

function openClearCacheConfirm(): void {
    showClearCacheConfirm.value = true;
}

function closeClearCacheConfirm(): void {
    showClearCacheConfirm.value = false;
}

async function confirmClearCache(): Promise<void> {
    isClearing.value = true;
    try {
        await db.surahs.clear();
        await db.ayahs.clear();
        await db.tikrarBlocks.clear();
        await db.hafalanProgress.clear();
        await db.tikrarSessions.clear();
        closeClearCacheConfirm();
        await initializeDatabase();
        await updateStorageInfo();
    } finally {
        isClearing.value = false;
    }
}

// Load combined with onMounted hook logic at the end instead.

const APP_VERSION = '1.0.0';

// -- Reader UI Mode Selection --
// We map directly to localStorage here so ReaderView picks it up instantly
type ReaderUIMode = 'app' | 'mushaf';
const uiMode = ref<ReaderUIMode>('app');

onMounted(() => {
    // Other storage info load
    void updateStorageInfo();
    
    // Load UI mode setting
    const saved = localStorage.getItem('tikrar-reader-ui-mode') as ReaderUIMode | null;
    if (saved === 'app' || saved === 'mushaf') {
        uiMode.value = saved;
    }
});

function setUIMode(mode: ReaderUIMode) {
    uiMode.value = mode;
    localStorage.setItem('tikrar-reader-ui-mode', mode);
}

async function shareApp(): Promise<void> {
    if (!navigator.share) {
        alert('Share is not supported on this device');
        return;
    }
    try {
        await navigator.share({
            title: 'Quran Tikrar',
            text: 'Aplikasi untuk menghafal Quran dengan metode Tikrar',
            url: window.location.href,
        });
    } catch (err) {
        // User cancelled the share dialog
    }
}
</script>

<template>
    <div class="settings-view">
        <header class="mb-4">
            <h1 class="text-xl font-extrabold tracking-tight text-slate-900">Pengaturan</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Preferensi aplikasi</p>
        </header>

        <!-- Section 1: Target Pengulangan -->
        <section class="section">
            <h2 class="section-title">Target Pengulangan</h2>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="opt in TARGET_PRESETS"
                    :key="opt.preset"
                    type="button"
                    class="preset-btn"
                    :class="{ active: settings.targetRepsPreset.value === opt.preset }"
                    @click="setTargetPreset(opt.preset)"
                >
                    {{ opt.label }}
                </button>
            </div>
            <div v-if="settings.targetRepsPreset.value === 'custom'" class="mt-3">
                <label class="block text-sm font-medium text-slate-700">Jumlah custom</label>
                <input
                    v-model.number="settings.customTargetReps"
                    type="number"
                    min="1"
                    max="999"
                    class="mt-1 w-full max-w-[8rem] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
            </div>
            <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">{{ previewTargetText }}</p>
        </section>

        <!-- Section 1.5: Tampilan Halaman Quran -->
        <section class="section">
            <h2 class="section-title">📄 Tampilan Halaman Quran</h2>
            <p class="text-sm text-slate-500 mb-4">Pilih gaya tampilan saat membaca</p>
            
            <div class="space-y-3">
                
                <!-- App Mode Option -->
                <div 
                    class="relative flex gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300"
                    :class="uiMode === 'app' ? 'border-[#059669] bg-[#F1FDF5] shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
                    @click="setUIMode('app')"
                >
                    <!-- Mini CSS Preview Mockup -->
                    <div class="shrink-0 w-16 h-20 bg-[#f8fafc] rounded-md border border-slate-200 p-1 flex flex-col gap-1 shadow-inner">
                        <div class="w-full h-3 rounded-sm bg-[#FFF8E7] shadow-sm" style="border-left: 2px solid #F5C842"></div>
                        <div class="w-full h-3 rounded-sm bg-[#EDFAF3] shadow-sm" style="border-left: 2px solid #3DBE7A"></div>
                        <div class="w-full h-3 rounded-sm bg-[#EAF3FF] shadow-sm" style="border-left: 2px solid #5B9BF5"></div>
                        <div class="w-full h-3 rounded-sm bg-[#FFF1EA] shadow-sm" style="border-left: 2px solid #F5824A"></div>
                    </div>
                    
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            Tampilan App
                            <span v-if="uiMode === 'app'" class="bg-[#059669] text-white text-[10px] rounded-full px-2 py-0.5 tracking-wide">AKTIF ✓</span>
                        </h3>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            Modern, dengan counter tikrar terintegrasi di dalam blok.
                        </p>
                    </div>
                </div>

                <!-- Mushaf Mode Option -->
                <div 
                    class="relative flex gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300"
                    :class="uiMode === 'mushaf' ? 'border-[#C4A882] bg-[#FFFDF8] shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
                    @click="setUIMode('mushaf')"
                >
                    <!-- Mini CSS Preview Mockup -->
                    <div class="shrink-0 w-16 h-20 bg-[#E8E0D0] rounded p-1 flex items-center justify-center">
                        <div class="w-full h-[90%] bg-[#FEFCF5] rounded-[1px] shadow-sm flex flex-col gap-0 border border-black/5 relative relative overflow-hidden">
                           <div class="h-0.5 w-full bg-[#8B7355]"></div>
                           <div class="flex-1 w-full pl-0.5 pt-0.5 flex flex-col gap-[1px]">
                               <div class="w-full h-2.5 bg-[#FEFCF5]" style="border-left: 2px solid #F5C842"></div>
                               <div class="w-full h-[1px] bg-[#E8DCC8]"></div>
                               <div class="w-full h-2.5 bg-[#FEFCF5]" style="border-left: 2px solid #3DBE7A"></div>
                               <div class="w-full h-[1px] bg-[#E8DCC8]"></div>
                               <div class="w-full h-2.5 bg-[#FEFCF5]" style="border-left: 2px solid #5B9BF5"></div>
                               <div class="w-full h-[1px] bg-[#E8DCC8]"></div>
                               <div class="w-full h-2.5 bg-[#FEFCF5]" style="border-left: 2px solid #F5824A"></div>
                           </div>
                           <div class="h-0.5 w-full bg-[#8B7355]"></div>
                        </div>
                    </div>
                    
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            Tampilan Mushaf
                            <span v-if="uiMode === 'mushaf'" class="bg-[#C4A882] text-[#3B2A1A] text-[10px] rounded-full px-2 py-0.5 tracking-wide font-bold">AKTIF ✓</span>
                        </h3>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            Seperti memegang halaman Mushaf Tikrar fisik klasik.
                        </p>
                    </div>
                </div>

            </div>
        </section>

        <!-- Section 2: Tampilan Teks Arab & Warna Blok -->
        <section class="section">
            <h2 class="section-title">Warna & Tampilan Teks</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700">Skema Warna Blok Tikrar</label>
                    <div class="mt-2 flex flex-col gap-2 relative">
                        <!-- Default Blue -->
                        <div 
                            class="relative flex gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-300"
                            :class="settings.blockColorMode.value === 'default' ? 'border-[#5B9BF5] bg-[#F0F6FF] shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
                            @click="settings.blockColorMode.value = 'default'"
                        >
                            <div class="flex-1">
                                <h3 class="font-bold text-slate-800 text-sm">Biru Laut (Default)</h3>
                                <p class="text-[11px] text-slate-500 mt-0.5">Warna biru terang & selang-seling blok transparan.</p>
                            </div>
                        </div>

                        <!-- 4 Colors -->
                        <div 
                            class="relative flex gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-300"
                            :class="settings.blockColorMode.value === 'four-colors' ? 'border-[#3DBE7A] bg-[#F5FDF8] shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'"
                            @click="settings.blockColorMode.value = 'four-colors'"
                        >
                            <div class="flex-1">
                                <h3 class="font-bold text-slate-800 text-sm">Empat Warna</h3>
                                <p class="text-[11px] text-slate-500 mt-0.5">Kuning, Hijau, Biru, Oranye (Klasik Blok Mushaf).</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-3">
                    <label class="block text-sm font-medium text-slate-700">Ukuran font</label>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <button
                            v-for="opt in FONT_OPTIONS"
                            :key="opt.value"
                            type="button"
                            class="preset-btn"
                            :class="{ active: settings.arabFontSize.value === opt.value }"
                            @click="settings.arabFontSize.value = opt.value"
                        >
                            {{ opt.label }}
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <span class="text-sm font-medium text-slate-700">Tampilkan terjemahan Indonesia</span>
                    <button
                        type="button"
                        class="toggle"
                        :class="{ on: settings.showTranslation.value }"
                        role="switch"
                        :aria-checked="settings.showTranslation.value"
                        @click="settings.showTranslation.value = !settings.showTranslation.value"
                    >
                        <span class="toggle-dot" />
                    </button>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <span class="text-sm font-medium text-slate-700">Tampilkan nomor halaman mushaf</span>
                    <button
                        type="button"
                        class="toggle"
                        :class="{ on: settings.showPageNumber.value }"
                        role="switch"
                        :aria-checked="settings.showPageNumber.value"
                        @click="settings.showPageNumber.value = !settings.showPageNumber.value"
                    >
                        <span class="toggle-dot" />
                    </button>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <span class="text-sm font-medium text-slate-700">Mode gelap</span>
                    <button
                        type="button"
                        class="toggle"
                        :class="{ on: settings.darkMode.value }"
                        role="switch"
                        :aria-checked="settings.darkMode.value"
                        aria-label="Toggle dark mode"
                        @click="settings.darkMode.value = !settings.darkMode.value"
                    >
                        <span class="toggle-dot" />
                    </button>
                </div>
            </div>
        </section>

        <!-- Section 3: Mode Tikrar -->
        <section class="section">
            <h2 class="section-title">Mode Tikrar</h2>
            <div class="space-y-3">
                <label class="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <input
                        v-model="settings.tikrarMode"
                        type="radio"
                        value="single"
                        class="mt-0.5"
                    />
                    <div>
                        <span class="font-medium text-slate-900">Per Blok</span>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Hafal blok 1, selesai lalu lanjut blok 2, dan seterusnya. Satu blok selesai sebelum pindah.
                        </p>
                    </div>
                </label>
                <label class="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <input
                        v-model="settings.tikrarMode"
                        type="radio"
                        value="cumulative"
                        class="mt-0.5"
                    />
                    <div>
                        <span class="font-medium text-slate-900">Kumulatif</span>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Blok 1, lalu blok 1+2, lalu 1+2+3, lalu 1+2+3+4. Setelah empat blok selesai, ada sesi gabungan seluruh halaman.
                        </p>
                    </div>
                </label>
            </div>
        </section>

        <!-- Section 4: Data & Cache -->
        <section class="section">
            <h2 class="section-title">Data & Cache</h2>
            <div class="space-y-3">
                <p class="text-sm text-slate-600 dark:text-slate-300">
                    Data Quran:
                    <template v-if="storageStatus === 'loading'"> Memuat… </template>
                    <template v-else-if="storageStatus === 'ready'">
                        ✅ Tersimpan
                        <template v-if="storageUsageMb != null"> ({{ storageUsageMb }} MB)</template>
                    </template>
                    <template v-else> Belum diunduh </template>
                </p>
                <p v-if="downloadedCount != null" class="text-sm text-slate-600 dark:text-slate-300">
                    Halaman terunduh: <strong>{{ downloadedCount }} dari {{ TOTAL_MUSHAF_PAGES }}</strong>
                    <template v-if="downloadedCount < TOTAL_MUSHAF_PAGES">
                        — pilih opsi unduh di bawah.
                    </template>
                </p>
                <div v-if="downloadedCount != null && downloadedCount < TOTAL_MUSHAF_PAGES" class="download-options space-y-4">
                    <div class="download-option">
                        <h3 class="text-sm font-semibold text-slate-700 mb-2">Opsi 1: Unduh per Juz</h3>
                        <p class="text-xs text-slate-500 mb-2">Pilih satu juz untuk diunduh (sekitar 20 halaman per juz).</p>
                        <div class="flex flex-wrap items-center gap-2">
                            <select
                                v-model.number="selectedJuz"
                                class="juz-select"
                                :disabled="isDownloadingJuz || isDownloadingRemaining"
                            >
                                <option v-for="opt in JUZ_OPTIONS" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                            <button
                                type="button"
                                class="action-btn"
                                :disabled="isDownloadingJuz || isDownloadingRemaining"
                                @click="startDownloadJuz"
                            >
                                {{ isDownloadingJuz ? `Mengunduh Juz ${selectedJuz}… ${seedProgress}%` : 'Unduh Juz ini' }}
                            </button>
                        </div>
                    </div>
                    <div class="download-option">
                        <h3 class="text-sm font-semibold text-slate-700 mb-2">Opsi 2: Unduh seluruh Quran</h3>
                        <p class="text-xs text-slate-500 mb-2">Unduh semua halaman yang belum ada (sisa data).</p>
                        <button
                            type="button"
                            class="action-btn"
                            :disabled="isDownloadingRemaining || isDownloadingJuz"
                            @click="startDownloadRemaining"
                        >
                            {{ isDownloadingRemaining ? `Mengunduh… ${seedProgress}%` : 'Unduh sisa data Quran' }}
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        type="button"
                        class="action-btn danger"
                        :disabled="isClearing"
                        @click="openClearCacheConfirm"
                    >
                        {{ isClearing ? 'Menghapus…' : 'Hapus Cache & Unduh Ulang' }}
                    </button>
                    <button
                        type="button"
                        class="action-btn"
                        :disabled="isExporting"
                        @click="exportProgress"
                    >
                        {{ isExporting ? 'Mengekspor…' : 'Export Progress' }}
                    </button>
                    <button
                        type="button"
                        class="action-btn danger"
                        @click="openResetConfirm"
                    >
                        Reset Semua Progress
                    </button>
                </div>
            </div>
        </section>

        <!-- Section 5: Tentang -->
        <section class="section">
            <h2 class="section-title">Tentang</h2>
            <div class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Quran Tikrar — v{{ APP_VERSION }}</p>
                <p>Data ayat dari <a href="https://quran.com" target="_blank" rel="noopener" class="text-[#1a7a4a] underline">Quran.com</a> API.</p>
                <p>
                    <a href="https://github.com/syofyanzuhad/quran-tikrar/issues" target="_blank" rel="noopener" class="text-[#1a7a4a] underline">Kirim masukan</a>
                </p>
                <button
                    type="button"
                    class="action-btn mt-2"
                    @click="shareApp"
                >
                    📤 Bagikan Aplikasi
                </button>
            </div>
        </section>

        <!-- Reset confirm modal -->
        <div v-if="showResetConfirm" class="modal-overlay" @click.self="closeResetConfirm">
            <div class="modal">
                <h3 class="text-lg font-semibold text-slate-900">Reset Semua Progress</h3>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Semua progress hafalan akan dihapus. Ketik <strong>RESET</strong> untuk konfirmasi.
                </p>
                <input
                    v-model="resetConfirmText"
                    type="text"
                    class="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ketik RESET"
                />
                <div class="mt-4 flex gap-2">
                    <button type="button" class="action-btn flex-1" @click="closeResetConfirm">
                        Batal
                    </button>
                    <button
                        type="button"
                        class="action-btn danger flex-1"
                        :disabled="!canReset || isResetting"
                        @click="confirmReset"
                    >
                        {{ isResetting ? 'Menghapus…' : 'Reset' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Clear cache confirm modal -->
        <div v-if="showClearCacheConfirm" class="modal-overlay" @click.self="closeClearCacheConfirm">
            <div class="modal">
                <h3 class="text-lg font-semibold text-slate-900">Hapus Cache & Unduh Ulang</h3>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Semua data Quran akan dihapus dan diunduh ulang. Pastikan koneksi internet tersedia.
                </p>
                <div class="mt-4 flex gap-2">
                    <button type="button" class="action-btn flex-1" @click="closeClearCacheConfirm">
                        Batal
                    </button>
                    <button
                        type="button"
                        class="action-btn danger flex-1"
                        :disabled="isClearing"
                        @click="confirmClearCache"
                    >
                        {{ isClearing ? 'Menghapus…' : 'Ya, Hapus & Unduh Ulang' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-view {
    padding: 1rem;
    padding-bottom: 5rem;
}
.section {
    margin-bottom: 1.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 1rem 1.25rem;
    border-radius: 1rem;
}
.section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #475569;
    margin: 0 0 0.75rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.preset-btn {
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.preset-btn:hover {
    background: #f8fafc;
}
.preset-btn.active {
    background: #1a7a4a;
    border-color: #1a7a4a;
    color: #fff;
}
.toggle {
    width: 2.5rem;
    height: 1.25rem;
    border-radius: 9999px;
    background: #cbd5e1;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
}
.toggle.on {
    background: #1a7a4a;
}
.toggle-dot {
    display: block;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: #fff;
    margin-left: 0.125rem;
    transition: transform 0.2s;
}
.toggle.on .toggle-dot {
    transform: translateX(1.25rem);
}
.action-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    transition: background 0.2s;
}
.action-btn:hover:not(:disabled) {
    background: #f1f5f9;
}
.action-btn.danger {
    border-color: #fecaca;
    color: #b91c1c;
}
.action-btn.danger:hover:not(:disabled) {
    background: #fef2f2;
}
.action-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}
.download-options {
    margin-top: 0.75rem;
}
.download-option {
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    background: #f8fafc;
}
.download-option h3 {
    margin: 0 0 0.5rem 0;
}
.download-option p {
    margin: 0 0 0.5rem 0;
}
.juz-select {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.875rem;
    min-width: 6rem;
}
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
}
.modal {
    background: #fff;
    border-radius: 1rem;
    padding: 1.25rem;
    max-width: 24rem;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
</style>
