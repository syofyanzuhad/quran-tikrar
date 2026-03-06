/**
 * Strip footnote markup from Quran translation text (e.g. from API).
 * Replaces <sup foot_note=123>1</sup> with Unicode superscript digit so
 * it displays cleanly as plain text.
 */
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export function formatTranslationText(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';
    return raw.replace(/<sup[^>]*>(\d+)<\/sup>/gi, (_, digit) => {
        return digit
            .split('')
            .map((d: string) => SUPERSCRIPT_DIGITS[Number(d)] ?? d)
            .join('');
    });
}
