import { ref, onMounted, onUnmounted } from 'vue';

let mediaQuery: MediaQueryList | null = null;

function getPrefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    if (!mediaQuery) {
        mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
    return mediaQuery.matches;
}

/**
 * Reactive prefers-reduced-motion. Use to skip or shorten animations.
 */
export function useReducedMotion() {
    const reduced = ref(getPrefersReducedMotion());
    let handler: ((e: MediaQueryListEvent) => void) | null = null;

    onMounted(() => {
        if (!mediaQuery) {
            mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        }
        reduced.value = mediaQuery.matches;
        handler = (e: MediaQueryListEvent) => {
            reduced.value = e.matches;
        };
        mediaQuery.addEventListener('change', handler);
    });

    onUnmounted(() => {
        if (mediaQuery && handler) {
            mediaQuery.removeEventListener('change', handler);
        }
    });

    return reduced;
}
