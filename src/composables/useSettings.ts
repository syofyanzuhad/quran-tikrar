import { ref, watch, type Ref } from 'vue';

const STORAGE_KEYS = {
    TARGET_REPS: 'tikrar-target-reps',
    ARAB_FONT_SIZE: 'tikrar-arab-font-size',
    SHOW_TRANSLATION: 'tikrar-show-translation',
    SHOW_PAGE_NUMBER: 'tikrar-show-page-number',
    TIKRAR_MODE: 'tikrar-mode',
    DARK_MODE: 'tikrar-dark-mode',
    BLOCK_COLOR_MODE: 'tikrar-block-color-mode',
} as const;

export type TargetRepsPreset = '7' | '10' | '20' | '40' | 'custom';
export type ArabFontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type TikrarMode = 'single' | 'cumulative';
export type BlockColorMode = 'default' | 'four-colors';

const DEFAULT_TARGET_REPS = 20;
const FONT_SIZE_MAP: Record<ArabFontSize, string> = {
    small: '1.5rem',
    medium: '1.875rem',
    large: '2.25rem',
    xlarge: '3rem',
};

function loadNumber(key: string, defaultVal: number): number {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return defaultVal;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : defaultVal;
    } catch {
        return defaultVal;
    }
}

function loadString<K extends string>(
    key: string,
    allowed: readonly K[],
    defaultVal: K
): K {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return defaultVal;
        return allowed.includes(raw as K) ? (raw as K) : defaultVal;
    } catch {
        return defaultVal;
    }
}

function loadBool(key: string, defaultVal: boolean): boolean {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return defaultVal;
        return raw === 'true';
    } catch {
        return defaultVal;
    }
}

export interface SettingsState {
    targetReps: Ref<number>;
    targetRepsPreset: Ref<TargetRepsPreset>;
    customTargetReps: Ref<number>;
    arabFontSize: Ref<ArabFontSize>;
    showTranslation: Ref<boolean>;
    showPageNumber: Ref<boolean>;
    tikrarMode: Ref<TikrarMode>;
    blockColorMode: Ref<BlockColorMode>;
    arabFontSizeRem: Ref<string>;
    darkMode: Ref<boolean>;
}

const PRESETS: { value: number; preset: TargetRepsPreset }[] = [
    { value: 7, preset: '7' },
    { value: 10, preset: '10' },
    { value: 20, preset: '20' },
    { value: 40, preset: '40' },
];

function presetForValue(n: number): TargetRepsPreset {
    const found = PRESETS.find((p) => p.value === n);
    return found ? found.preset : 'custom';
}

export function useSettings(): SettingsState {
    const targetReps = ref<number>(
        loadNumber(STORAGE_KEYS.TARGET_REPS, DEFAULT_TARGET_REPS)
    );
    const targetRepsPreset = ref<TargetRepsPreset>(presetForValue(targetReps.value));
    const customTargetReps = ref<number>(
        PRESETS.some((p) => p.value === targetReps.value) ? 20 : targetReps.value
    );
    const arabFontSize = ref<ArabFontSize>(
        loadString(STORAGE_KEYS.ARAB_FONT_SIZE, ['small', 'medium', 'large', 'xlarge'], 'medium')
    );
    const showTranslation = ref<boolean>(loadBool(STORAGE_KEYS.SHOW_TRANSLATION, true));
    const showPageNumber = ref<boolean>(loadBool(STORAGE_KEYS.SHOW_PAGE_NUMBER, true));
    const tikrarMode = ref<TikrarMode>(
        loadString(STORAGE_KEYS.TIKRAR_MODE, ['single', 'cumulative'], 'single')
    );
    const blockColorMode = ref<BlockColorMode>(
        loadString(STORAGE_KEYS.BLOCK_COLOR_MODE, ['default', 'four-colors'], 'four-colors')
    );
    const darkMode = ref<boolean>(loadBool(STORAGE_KEYS.DARK_MODE, false));

    const arabFontSizeRem = ref<string>(FONT_SIZE_MAP[arabFontSize.value]);

    watch(
        arabFontSize,
        (s) => {
            arabFontSizeRem.value = FONT_SIZE_MAP[s];
        },
        { immediate: true }
    );

    watch(targetReps, (n) => {
        localStorage.setItem(STORAGE_KEYS.TARGET_REPS, String(n));
        targetRepsPreset.value = presetForValue(n);
        if (presetForValue(n) === 'custom') customTargetReps.value = n;
    });

    watch(targetRepsPreset, (preset) => {
        if (preset !== 'custom') {
            const v = PRESETS.find((p) => p.preset === preset)?.value ?? DEFAULT_TARGET_REPS;
            targetReps.value = v;
        } else {
            targetReps.value = Math.max(1, Math.min(999, customTargetReps.value));
        }
    });

    watch(customTargetReps, (n) => {
        if (targetRepsPreset.value === 'custom') {
            targetReps.value = Math.max(1, Math.min(999, n));
        }
    });

    watch(arabFontSize, (s) => {
        localStorage.setItem(STORAGE_KEYS.ARAB_FONT_SIZE, s);
    });

    watch(showTranslation, (v) => {
        localStorage.setItem(STORAGE_KEYS.SHOW_TRANSLATION, String(v));
    });

    watch(showPageNumber, (v) => {
        localStorage.setItem(STORAGE_KEYS.SHOW_PAGE_NUMBER, String(v));
    });

    watch(tikrarMode, (v) => {
        localStorage.setItem(STORAGE_KEYS.TIKRAR_MODE, v);
    });

    watch(blockColorMode, (v) => {
        localStorage.setItem(STORAGE_KEYS.BLOCK_COLOR_MODE, v);
    });

    watch(
        darkMode,
        (v) => {
            localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(v));
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('dark', v);
            }
        },
        { immediate: true }
    );

    return {
        targetReps,
        targetRepsPreset,
        customTargetReps,
        arabFontSize,
        showTranslation,
        showPageNumber,
        tikrarMode,
        blockColorMode,
        arabFontSizeRem,
        darkMode,
    };
}

export const SETTINGS_KEY = Symbol('quran-tikrar-settings');
