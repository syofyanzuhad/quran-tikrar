/**
 * Haptic feedback for mobile. Wrapped in try-catch (not all browsers support).
 */
export function hapticRepIncrement(): void {
    try {
        if ('vibrate' in navigator) {
            navigator.vibrate(30);
        }
    } catch {
        /* ignore */
    }
}

export function hapticBlockComplete(): void {
    try {
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
        }
    } catch {
        /* ignore */
    }
}
