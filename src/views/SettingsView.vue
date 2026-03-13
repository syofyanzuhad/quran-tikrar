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

const APP_VERSION = '1.0.0';

type ReaderUIMode = 'app' | 'mushaf';
const uiMode = ref<ReaderUIMode>('app');

onMounted(() => {
    void updateStorageInfo();
    const saved = localStorage.getItem('tikrar-reader-ui-mode') as ReaderUIMode | null;
    if (saved === 'app' || saved === 'mushaf') {
        uiMode.value = saved;
    }
});

function setUIMode(mode: ReaderUIMode) {
    uiMode.value = mode;
    localStorage.setItem('tikrar-reader-ui-mode', mode);
}
</script>

<template>
    <div class="settings-view">
        <header class="settings-header">
            <h1 class="settings-title">Pengaturan</h1>
            <p class="settings-subtitle">Preferensi aplikasi</p>
        </header>

        <section class="section">
            <h2 class="section-title">Target Pengulangan</h2>
            <div class="preset-row">
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
            <div v-if="settings.targetRepsPreset.value === 'custom'" class="custom-input">
                <label class="input-label">Jumlah custom</label>
                <input
                    v-model.number="settings.customTargetReps"
                    type="number"
                    min="1"
                    max="999"
                    class="input-field"
                />
            </div>
            <p class="helper-text">{{ previewTargetText }}</p>
        </section>

        <section class="section">
            <h2 class="section-title">📄 Tampilan Halaman Quran</h2>
            <p class="section-desc">Pilih gaya tampilan saat membaca</p>

            <div class="ui-mode-list">
                <div
                    class="ui-mode-card"
                    :class="uiMode === 'app' ? 'ui-mode-card--active' : ''"
                    @click="setUIMode('app')"
                >
                    <div class="ui-mode-preview ui-mode-preview--app">
                        <div class="ui-mode-preview__block block-yellow"></div>
                        <div class="ui-mode-preview__block block-green"></div>
                        <div class="ui-mode-preview__block block-blue"></div>
                        <div class="ui-mode-preview__block block-orange"></div>
                    </div>

                    <div class="ui-mode-content">
                        <h3 class="ui-mode-title">
                            Tampilan App
                            <span v-if="uiMode === 'app'" class="ui-mode-badge ui-mode-badge--app">AKTIF ✓</span>
                        </h3>
                        <p class="ui-mode-desc">Modern, dengan counter tikrar terintegrasi di dalam blok.</p>
                    </div>
                </div>

                <div
                    class="ui-mode-card"
                    :class="uiMode === 'mushaf' ? 'ui-mode-card--mushaf' : ''"
                    @click="setUIMode('mushaf')"
                >
                    <div class="ui-mode-preview ui-mode-preview--mushaf">
                        <div class="mushaf-mini">
                            <div class="mushaf-mini__ornament"></div>
                            <div class="mushaf-mini__lines">
                                <div class="mushaf-mini__line line-yellow"></div>
                                <div class="mushaf-mini__divider"></div>
                                <div class="mushaf-mini__line line-green"></div>
                                <div class="mushaf-mini__divider"></div>
                                <div class="mushaf-mini__line line-blue"></div>
                                <div class="mushaf-mini__divider"></div>
                                <div class="mushaf-mini__line line-orange"></div>
                            </div>
                            <div class="mushaf-mini__ornament"></div>
                        </div>
                    </div>

                    <div class="ui-mode-content">
                        <h3 class="ui-mode-title">
                            Tampilan Mushaf
                            <span v-if="uiMode === 'mushaf'" class="ui-mode-badge ui-mode-badge--mushaf">AKTIF ✓</span>
                        </h3>
                        <p class="ui-mode-desc">Seperti memegang halaman Mushaf Tikrar fisik klasik.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Warna & Tampilan Teks</h2>
            <div class="option-group">
                <div>
                    <label class="input-label">Skema Warna Blok Tikrar</label>
                    <div class="option-list">
                        <div
                            class="option-card"
                            :class="settings.blockColorMode.value === 'default' ? 'option-card--blue' : ''"
                            @click="settings.blockColorMode.value = 'default'"
                        >
                            <div class="option-card__content">
                                <h3 class="option-card__title">Biru Laut (Default)</h3>
                                <p class="option-card__desc">Warna biru terang & selang-seling blok transparan.</p>
                            </div>
                        </div>

                        <div
                            class="option-card"
                            :class="settings.blockColorMode.value === 'four-colors' ? 'option-card--green' : ''"
                            @click="settings.blockColorMode.value = 'four-colors'"
                        >
                            <div class="option-card__content">
                                <h3 class="option-card__title">Empat Warna</h3>
                                <p class="option-card__desc">Kuning, Hijau, Biru, Oranye (Klasik Blok Mushaf).</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="option-divider">
                    <label class="input-label">Ukuran font</label>
                    <div class="preset-row">
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

                <div class="toggle-row">
                    <span class="toggle-label">Tampilkan terjemahan Indonesia</span>
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
                <div class="toggle-row">
                    <span class="toggle-label">Tampilkan nomor halaman mushaf</span>
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
                <div class="toggle-row">
                    <span class="toggle-label">Mode gelap</span>
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

        <section class="section">
            <h2 class="section-title">Mode Tikrar</h2>
            <div class="radio-list">
                <label class="radio-card">
                    <input
                        v-model="settings.tikrarMode"
                        type="radio"
                        value="single"
                        class="radio-input"
                    />
                    <div>
                        <span class="radio-title">Per Blok</span>
                        <p class="radio-desc">
                            Hafal blok 1, selesai lalu lanjut blok 2, dan seterusnya. Satu blok selesai sebelum pindah.
                        </p>
                    </div>
                </label>
                <label class="radio-card">
                    <input
                        v-model="settings.tikrarMode"
                        type="radio"
                        value="cumulative"
                        class="radio-input"
                    />
                    <div>
                        <span class="radio-title">Kumulatif</span>
                        <p class="radio-desc">
                            Blok 1, lalu blok 1+2, lalu 1+2+3, lalu 1+2+3+4. Setelah empat blok selesai, ada sesi gabungan seluruh halaman.
                        </p>
                    </div>
                </label>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">Data & Cache</h2>
            <div class="option-group">
                <p class="info-text">
                    Data Quran:
                    <template v-if="storageStatus === 'loading'"> Memuat… </template>
                    <template v-else-if="storageStatus === 'ready'">
                        ✅ Tersimpan
                        <template v-if="storageUsageMb != null"> ({{ storageUsageMb }} MB)</template>
                    </template>
                    <template v-else> Belum diunduh </template>
                </p>
                <p v-if="downloadedCount != null" class="info-text">
                    Halaman terunduh: <strong>{{ downloadedCount }} dari {{ TOTAL_MUSHAF_PAGES }}</strong>
                    <template v-if="downloadedCount < TOTAL_MUSHAF_PAGES">
                        — pilih opsi unduh di bawah.
                    </template>
                </p>
                <div v-if="downloadedCount != null && downloadedCount < TOTAL_MUSHAF_PAGES" class="download-options">
                    <div class="download-option">
                        <h3 class="option-title">Opsi 1: Unduh per Juz</h3>
                        <p class="option-desc">Pilih satu juz untuk diunduh (sekitar 20 halaman per juz).</p>
                        <div class="option-row">
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
                        <h3 class="option-title">Opsi 2: Unduh seluruh Quran</h3>
                        <p class="option-desc">Unduh semua halaman yang belum ada (sisa data).</p>
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
                <div class="button-row">
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

        <section class="section">
            <h2 class="section-title">Tentang</h2>
            <div class="info-list">
                <p>Quran Tikrar — v{{ APP_VERSION }}</p>
                <p>Data ayat dari <a href="https://quran.com" target="_blank" rel="noopener" class="link">Quran.com</a> API.</p>
                <p>
                    <a href="https://github.com/your-repo/quran-tikrar/issues" target="_blank" rel="noopener" class="link">Kirim masukan</a>
                </p>
            </div>
        </section>

        <div v-if="showResetConfirm" class="modal-overlay" @click.self="closeResetConfirm">
            <div class="modal">
                <h3 class="modal-title">Reset Semua Progress</h3>
                <p class="modal-text">
                    Semua progress hafalan akan dihapus. Ketik <strong>RESET</strong> untuk konfirmasi.
                </p>
                <input
                    v-model="resetConfirmText"
                    type="text"
                    class="input-field input-field--full"
                    placeholder="Ketik RESET"
                />
                <div class="modal-actions">
                    <button type="button" class="action-btn flex" @click="closeResetConfirm">
                        Batal
                    </button>
                    <button
                        type="button"
                        class="action-btn danger flex"
                        :disabled="!canReset || isResetting"
                        @click="confirmReset"
                    >
                        {{ isResetting ? 'Menghapus…' : 'Reset' }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showClearCacheConfirm" class="modal-overlay" @click.self="closeClearCacheConfirm">
            <div class="modal">
                <h3 class="modal-title">Hapus Cache & Unduh Ulang</h3>
                <p class="modal-text">
                    Semua data Quran akan dihapus dan diunduh ulang. Pastikan koneksi internet tersedia.
                </p>
                <div class="modal-actions">
                    <button type="button" class="action-btn flex" @click="closeClearCacheConfirm">
                        Batal
                    </button>
                    <button
                        type="button"
                        class="action-btn danger flex"
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

.settings-header {
    margin-bottom: 1rem;
}

.settings-title {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
    margin: 0;
}

.settings-subtitle {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #64748b;
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

.section-desc {
    font-size: 0.85rem;
    color: #94a3b8;
    margin: 0 0 1rem;
}

.preset-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
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

.custom-input {
    margin-top: 0.75rem;
}

.input-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 0.35rem;
}

.input-field {
    width: 8rem;
    max-width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.6rem;
    border: 1px solid #e2e8f0;
    font-size: 0.875rem;
}

.input-field--full {
    width: 100%;
}

.helper-text {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: #64748b;
}

.ui-mode-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.ui-mode-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.9rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.ui-mode-card--active {
    border-color: #059669;
    background: #f1fdf5;
    box-shadow: 0 6px 12px rgba(5, 150, 105, 0.12);
}

.ui-mode-card--mushaf {
    border-color: #C4A882;
    background: #fffcf6;
    box-shadow: 0 6px 12px rgba(196, 168, 130, 0.15);
}

.ui-mode-preview {
    width: 64px;
    height: 80px;
    border-radius: 8px;
    padding: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
}

.ui-mode-preview__block {
    height: 12px;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
}

.block-yellow { background: #FFF8E7; border-left: 2px solid #F5C842; }
.block-green { background: #EDFAF3; border-left: 2px solid #3DBE7A; }
.block-blue { background: #EAF3FF; border-left: 2px solid #5B9BF5; }
.block-orange { background: #FFF1EA; border-left: 2px solid #F5824A; }

.ui-mode-preview--mushaf {
    background: #E8E0D0;
    border: none;
    padding: 0.35rem;
    align-items: center;
    justify-content: center;
}

.mushaf-mini {
    width: 100%;
    height: 90%;
    background: #FEFCF5;
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.mushaf-mini__ornament {
    height: 4px;
    background: #8B7355;
}

.mushaf-mini__lines {
    flex: 1;
    padding: 4px 2px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mushaf-mini__line {
    height: 8px;
    background: #FEFCF5;
    border-left: 2px solid #F5C842;
}

.mushaf-mini__divider {
    height: 1px;
    background: #E8DCC8;
}

.line-yellow { border-left-color: #F5C842; }
.line-green { border-left-color: #3DBE7A; }
.line-blue { border-left-color: #5B9BF5; }
.line-orange { border-left-color: #F5824A; }

.ui-mode-content {
    flex: 1;
}

.ui-mode-title {
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
}

.ui-mode-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    letter-spacing: 0.08em;
}

.ui-mode-badge--app {
    background: #059669;
    color: #fff;
}

.ui-mode-badge--mushaf {
    background: #C4A882;
    color: #3B2A1A;
    font-weight: 700;
}

.ui-mode-desc {
    margin: 0.4rem 0 0;
    font-size: 0.75rem;
    color: #64748b;
}

.option-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.option-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.option-card {
    padding: 0.75rem;
    border-radius: 0.85rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.option-card--blue {
    border-color: #5B9BF5;
    background: #f0f6ff;
    box-shadow: 0 4px 10px rgba(91, 155, 245, 0.2);
}

.option-card--green {
    border-color: #3DBE7A;
    background: #f5fdf8;
    box-shadow: 0 4px 10px rgba(61, 190, 122, 0.2);
}

.option-card__title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: #1f2937;
}

.option-card__desc {
    margin: 0.25rem 0 0;
    font-size: 0.7rem;
    color: #64748b;
}

.option-divider {
    border-top: 1px solid #f1f5f9;
    padding-top: 0.75rem;
}

.toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0.75rem 1rem;
}

.toggle-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
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

.radio-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.radio-card {
    display: flex;
    gap: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0.9rem;
    cursor: pointer;
}

.radio-input {
    margin-top: 0.2rem;
}

.radio-title {
    font-weight: 700;
    color: #0f172a;
}

.radio-desc {
    margin-top: 0.35rem;
    font-size: 0.75rem;
    color: #64748b;
}

.info-text {
    font-size: 0.85rem;
    color: #64748b;
    margin: 0;
}

.download-options {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.download-option {
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    background: #f8fafc;
}

.option-title {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: #475569;
}

.option-desc {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    color: #94a3b8;
}

.option-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}

.juz-select {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.875rem;
    min-width: 6rem;
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

.button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.info-list {
    font-size: 0.85rem;
    color: #64748b;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.link {
    color: #1a7a4a;
    text-decoration: underline;
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

.modal-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
}

.modal-text {
    margin: 0.75rem 0 1rem;
    font-size: 0.85rem;
    color: #64748b;
}

.modal-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.flex {
    flex: 1;
}
</style>
