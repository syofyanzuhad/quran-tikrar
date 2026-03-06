# 🕌 Quran Tikrar App — AI Context & Project Rules

> Baca file ini sebelum mengerjakan task apapun di project ini.
> File ini menjelaskan konteks, arsitektur, UI/UX ekspektasi, dan aturan coding.

---

## 📌 Apa Aplikasi Ini?

Aplikasi **Quran Tikrar** adalah aplikasi mobile-first PWA untuk menghafal Al-Quran
menggunakan metode **Tikrar (تكرار)** — metode menghafal dengan pengulangan sistematis.

### Konsep Utama Metode Tikrar
- Satu halaman mushaf dibagi menjadi **4 blok warna**
- User mengulang setiap blok sebanyak **target tertentu** (default: 20x) sebelum lanjut
- Setelah 4 blok selesai, user mengulang **seluruh halaman** sebagai "sesi gabungan"
- Urutan: Blok 1 → Blok 2 → Blok 3 → Blok 4 → Gabungan (full halaman)
- Ini mencerminkan struktur **Mushaf Tikrar fisik** yang memiliki 4 blok warna per halaman

---

## 🛠️ Tech Stack

| Layer | Library | Keterangan |
|---|---|---|
| Framework | Vue 3 + TypeScript | Composition API, `<script setup>` |
| Build | Vite | Fast HMR, optimized build |
| State | Pinia | Store untuk quran & progress |
| Database lokal | Dexie.js | IndexedDB wrapper, offline storage |
| Routing | Vue Router 4 | SPA navigation |
| PWA | vite-plugin-pwa + Workbox | Service worker, offline-first |
| HTTP | Axios | Fetch data dari quran.com API |
| Utilities | @vueuse/core | Composables (swipe, media query, dll) |
| Styling | Plain CSS / scoped | No Tailwind; utility classes manual |
| Icons | Emoji / inline SVG | No @heroicons; BottomNav pakai emoji |

---

## 📁 Struktur Folder

```
src/
├── assets/
│   └── fonts/                  # Arabic fonts jika di-host lokal
├── components/
│   ├── quran/
│   │   ├── BlockReader.vue     # KOMPONEN UTAMA — tampilkan 4 blok ayat
│   │   ├── AyahBlock.vue       # Satu blok ayat (warna + teks Arab + counter)
│   │   ├── TikrarCounter.vue   # Counter lingkaran + tombol + (circle progress)
│   │   └── PageProgress.vue    # Progress bar + status blok dots
│   └── ui/
│       ├── BottomNav.vue       # Navigasi 4 tab
│       ├── OfflineBanner.vue   # Status online/offline
│       └── LoadingSpinner.vue
├── composables/
│   ├── useQuran.ts             # Fetch, cache, seed data Quran
│   ├── useTikrar.ts            # Session tikrar, rep counter, state blok
│   ├── useProgress.ts          # Query progress dari Dexie
│   └── useSettings.ts          # User preferences (target rep, font size, dll)
├── db/
│   ├── index.ts                # Dexie database setup + semua tabel
│   └── seed.ts                 # Seed data dari quran.com API ke IndexedDB
├── router/
│   └── index.ts
├── stores/
│   ├── quranStore.ts           # State: surah list, current page, ayahs
│   └── progressStore.ts        # State: progress per halaman & juz
├── types/
│   └── quran.ts                # Semua TypeScript interfaces
└── views/
    ├── HomeView.vue            # List surah + juz + lanjutkan
    ├── ReaderView.vue          # Halaman baca + tikrar utama
    ├── ProgressView.vue        # Dashboard progress hafalan
    └── SettingsView.vue        # Pengaturan app
```

---

## 🗄️ Database Schema (Dexie / IndexedDB)

```typescript
// src/types/quran.ts

interface Surah {
  id: number
  nameArabic: string        // "الفاتحة"
  nameSimple: string        // "Al-Fatihah"
  nameTranslation: string   // "Pembukaan"
  versesCount: number
  revelationPlace: 'makkah' | 'madinah'
}

interface Ayah {
  id: number                // unique global (1–6236)
  surahId: number
  verseNumber: number
  textArab: string          // teks uthmani
  textIndoTranslation: string
  page: number              // halaman mushaf 1–604
  juz: number               // 1–30
  hizb: number
}

interface TikrarBlock {
  id: string                // "page-{n}-block-{0..3}"
  pageNumber: number
  blockIndex: number        // 0, 1, 2, 3
  ayahIds: number[]
  color: 'yellow' | 'green' | 'blue' | 'orange'
  targetReps: number        // dari settings user
}

interface TikrarSession {
  id: string                // uuid
  blockId: string
  repetitions: number
  isCompleted: boolean
  completedAt: Date | null
  createdAt: Date
}

interface HafalanProgress {
  id: string                // "page-{n}"
  pageNumber: number
  surahId: number
  blocksCompleted: number   // 0–4
  totalBlocks: number       // selalu 4
  isPageCompleted: boolean
  lastStudiedAt: Date
  totalReps: number
}
```

---

## 🎨 Design System & UI Ekspektasi

### Warna Blok (PENTING — harus konsisten)

| Blok | Index | Background | Border | Dot/Accent |
|---|---|---|---|---|
| Blok 1 | 0 | `#FFF8E7` | `#F5C842` | Kuning |
| Blok 2 | 1 | `#EDFAF3` | `#3DBE7A` | Hijau |
| Blok 3 | 2 | `#EAF3FF` | `#5B9BF5` | Biru |
| Blok 4 | 3 | `#FFF1EA` | `#F5824A` | Oranye |
| Gabungan | — | `linear-gradient(135deg, #ecfdf5, #d1fae5)` | `#059669` | Hijau tua |

### Warna Utama App

```css
--color-primary: #059669;        /* Hijau islami utama */
--color-primary-dark: #065f46;
--color-primary-light: #ecfdf5;
--color-text: #111827;
--color-text-muted: #6b7280;
--color-text-faint: #9ca3af;
--color-border: #f3f4f6;
--color-bg: #f8fafc;
--color-card: #ffffff;
```

### Tipografi

- **UI umum**: `'Nunito'` — rounded, friendly, weight 400/600/700/800/900
- **Teks Arab**: `'Scheherazade New'` atau `'Amiri'` dari Google Fonts
  - `font-size: 22px`, `line-height: 2.2`, `direction: rtl`, `text-align: right`
- **Nomor ayat**: lingkaran kecil dengan warna blok terkait, ukuran 22–24px

### Prinsip Layout

- **Mobile-first**: desain untuk lebar 390px (iPhone 14 Pro), max-width di desktop
- **Bottom navigation**: 4 tab (Surah, Baca, Progress, Atur) — selalu fixed di bawah
- **Card-based**: setiap section dalam rounded card (border-radius: 16–18px)
- **Spacing**: padding konsisten 16–20px dari tepi layar

---

## 🖥️ Dual Reader UI Variants

The Quran reader has TWO interchangeable UI modes.
Both are located in `src/components/reader/` and share identical props/emits.

### Mode A — AppReader.vue
- Modern mobile app aesthetic
- Vibrant solid block colors from `BLOCK_COLORS[i].bg` / `.border`
- Rounded cards (border-radius 16–18px)
- TikrarCounter shown as floating pill inside active block
- Arabic text: 20px, ayah markers as circle badges
- Background: `#f8fafc`

### Mode B — MushafReader.vue
- Physical Quran page aesthetic
- Soft parchment colors from `BLOCK_COLORS[i].mushafBg` / `.mushafBorder`
- Near-square corners (border-radius 3px), stacked paper shadow
- TikrarCounter shown as compact strip with backdrop-blur
- Arabic text: 17–19px, ayah markers use traditional ۝ character
- Background: `#E8E0D0` (desk/table surface)
- Ornament bars top and bottom using brown-gold gradient

**MushafReader uses `line_number` data from quran.com API to ensure block boundaries match the physical Mushaf Tikrar exactly.**
Block 1 = lines 1–4, Block 2 = lines 5–8, Block 3 = lines 9–12, Block 4 = lines 13–15. This data is stored in the `words` table in IndexedDB and never relies on browser text wrapping.

### ⚠️ Key Technical Notes

Never rely on browser text wrapping for line breaks.
The `line_number` field from the API IS the ground truth.
Words are pre-assigned to lines — we just render them.
Block boundaries are LINE-based, not AYAH-based.
An ayah can span multiple blocks if its words fall on different line groups.
This matches the physical Mushaf Tikrar exactly.
Font choice affects visual quality, NOT accuracy.
Even with a fallback font, blocks will be correct because
we use API `line_number` data, not CSS text wrapping.
Page 1 (Al-Fatihah) and short surahs near the end of the Quran
may have fewer than 15 text lines. The remaining lines should be
rendered as empty lines to maintain consistent page height.
The `words` table will have ~77,000+ rows.
Always query with `db.words.where('pageNumber').equals(n)`
to use the index — never scan the full table.

### Switching Logic
- User toggles in `ReaderView.vue` or in Settings
- Preference persisted: `localStorage` key `'tikrar-reader-ui-mode'`
- Both modes mount/unmount cleanly — no shared DOM state
- Tikrar state (reps, activeBlock) is owned by `useTikrar` composable,
  not by either UI component — so switching never loses progress

### Color Constants
NEVER hardcode block colors in components.
ALWAYS import from: `src/constants/blockColors.ts` → `BLOCK_COLORS` array

Use `.bg` / `.border` / `.accent` / `.soft` for AppReader.
Use `.mushafBg` / `.mushafBorder` / `.mushafInk` / `.mushafStripe` for MushafReader.

---

## 🔄 Alur User Utama (Reader Flow)

```
User buka halaman
    │
    ▼
Tampilkan 4 blok ayat secara vertikal
    │
    ▼
Blok 1 AKTIF (highlight, shadow, scale sedikit)
User tap + berulang hingga mencapai target (20x)
    │
    ▼ (otomatis setelah target tercapai)
Toast: "✅ Blok 1 selesai! Lanjut Blok 2"
Blok 2 AKTIF
    │
    ▼ (repeat untuk blok 3 & 4)
    │
    ▼ (setelah blok 4 selesai)
Fase GABUNGAN:
Tampilkan semua ayat halaman dalam 1 card hijau
User ulang full halaman sejumlah target
    │
    ▼
Toast: "🌟 Masya Allah! Halaman selesai"
Tampilkan layar completion + simpan progress ke Dexie
```

---

## 📡 Data Source

**API**: `https://api.quran.com/api/v4/`

```
GET /chapters
  → daftar 114 surah

GET /verses/by_page/{page}
  ?words=false
  &translations=33        ← ID terjemahan Bahasa Indonesia
  &fields=text_uthmani,page_number,juz_number,hizb_number
  → ayat per halaman mushaf (halaman 1–604)
```

**Strategi offline:**
1. App pertama kali buka → cek IndexedDB
2. Jika kosong + online → jalankan seed (fetch + simpan semua data)
3. Setelah seed → app bisa dipakai 100% offline
4. Progress hafalan disimpan lokal (tidak perlu server/auth)

---

## ⚙️ User Preferences (via localStorage)

```typescript
interface AppSettings {
  targetReps: 7 | 10 | 20 | 40    // default: 20
  arabFontSize: 'sm' | 'md' | 'lg' | 'xl'  // default: 'md'
  showTranslation: boolean          // default: true
  showPageNumber: boolean           // default: true
  tikrarMode: 'single' | 'cumulative'  // default: 'single'
  darkMode: boolean                 // default: false
  lastPageOpened: number            // untuk "lanjutkan"
}
```

---

## 🚫 Aturan Coding (WAJIB DIIKUTI)

1. **Selalu gunakan `<script setup lang="ts">`** — tidak boleh Options API
2. **Semua interface/type di `src/types/quran.ts`** — jangan buat inline type
3. **Tidak boleh fetch langsung di komponen** — semua data melalui composable atau store
4. **IndexedDB hanya via Dexie** — tidak boleh pakai raw IndexedDB API
5. **Styling via CSS (scoped atau global)** — hindari inline style kecuali nilai dinamis. (Tailwind tidak dipasang.)
6. **Blok warna konsisten** — gunakan skema kuning/hijau/biru/oranye; BLOCK_COLORS di seed untuk nama warna.
7. **Semua teks UI dalam Bahasa Indonesia** — kecuali teks Arab Quran
8. **Error / fallback UI** — tampilkan fallback jika data gagal load (try/catch + pesan/empty state).
9. **Loading state selalu ada** — jangan tampilkan UI kosong tanpa skeleton/spinner
10. **Setiap komponen harus punya `defineProps` dengan TypeScript** — tidak boleh untyped props

---

## ✅ Checklist Fitur yang Harus Ada

- [x] Tampilkan 4 blok warna per halaman mushaf
- [x] TikrarCounter: circle progress + tombol + / reset
- [x] User tandai selesai → blok complete, bisa pindah blok (manual tap "Tandai Selesai"; tidak auto-advance)
- [ ] **Sesi Gabungan** — logic di useTikrar (isCombinedAvailable, combinedId) ada; **UI fase gabungan** (satu card hijau full halaman + counter) belum
- [x] Progress tersimpan offline di IndexedDB
- [x] List surah dengan progress bar
- [x] Dashboard progress: total halaman, streak, juz grid
- [x] Heatmap aktivitas belajar
- [x] Settings: target rep, ukuran font, terjemahan, dark mode
- [x] PWA: installable, offline-first, service worker
- [x] Swipe gesture untuk ganti halaman (kiri/kanan)
- [ ] **Toast notification** — event block-complete/page-complete di-emit; **belum ada komponen Toast** ("✅ Blok X selesai!", "🌟 Masya Allah! Halaman selesai")
- [x] Onboarding screen (pertama kali buka)

### 📋 Status Implementasi vs Context (per terakhir cek)

| Item | Context | Kenyataan |
|------|--------|----------|
| Tech stack | Tailwind, @heroicons | CSS biasa, emoji/SVG; tidak pakai Tailwind |
| State | Pinia stores | Composables (useQuran, useTikrar, useProgress); file store ada tapi tidak dipakai di view |
| Bottom nav | 4 tab (Surah, Baca, Progress, Atur) | 3 tab: Quran (/), Progress, Pengaturan. Baca = route /baca/:page (dibuka dari Home) |
| Tipografi UI | Nunito | system-ui / Avenir (tidak ada Nunito) |
| TikrarSession | punya createdAt | types hanya id, blockId, repetitions, completedAt, isCompleted |
| Error boundary | Di setiap view | Hanya try/catch di beberapa tempat; tidak ada komponen ErrorBoundary |
| Warna blok | Hex #FFF8E7 dll | **Diperbaiki:** light mode pakai hex context di style.css; dark pakai yellow-900 dll |

### 🔍 Pengecekan UI (audit)

- **Warna blok (light)** — Semula class `bg-yellow-50` dll tidak didefinisikan di CSS (hanya dark override) → blok bisa tampil tanpa background. **Sudah diperbaiki:** ditambah di `style.css` dengan hex dari design system (#FFF8E7, #EDFAF3, #EAF3FF, #FFF1EA + border #F5C842, #3DBE7A, #5B9BF5, #F5824A).
- **PageProgress** — Teks "Page" dan "Done" diganti ke **Bahasa Indonesia**: "Halaman" dan "Selesai".
- **Layout** — HomeView/ProgressView/SettingsView pakai padding ~1rem, card radius 0.75–1rem, konsisten.
- **TikrarCounter** — Ada ring progress, tombol +/reset, animasi pop/checkmark, haptic; warna pakai var(--accent).
- **Reader** — Nav prev/next, BlockReader 4 cards dengan class warna; teks Arab pakai Uthmanic Hafs / Scheherazade; font size dari --arab-font-size.
- **Tipografi** — UI pakai system-ui/Avenir (bukan Nunito); Arab sesuai context. Belum ada Google Fonts Nunito/Amiri di project.

---

## 🎯 Referensi UI

Tampilan yang diinginkan mirip dengan kombinasi:
- **Simplisitas** seperti Muslim Pro / Quran.com app
- **Blok warna** seperti Mushaf Tikrar fisik (4 warna per halaman)
- **Counter UI** seperti tasbih digital — angka besar, tombol mudah ditap
- **Progress dashboard** seperti Duolingo — streak, heatmap, gamifikasi ringan

Kesan keseluruhan: **tenang, bersih, islami** — bukan gaming/flashy.
Warna dominan: **putih + hijau** dengan aksen 4 warna blok.