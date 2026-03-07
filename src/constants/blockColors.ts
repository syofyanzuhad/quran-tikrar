import type { BlockColor } from '../types/reader'

export type BlockColorMode = 'default' | 'four-colors';

const FOUR_COLORS_LIGHT: ReadonlyArray<BlockColor> = [
  {
    // Block 0 — Yellow
    bg: '#FFF8E7',
    border: '#F5C842',
    accent: '#D97706',
    soft: '#FEF3C7',
    mushafBg: '#FFFDF0',
    mushafStripe: '#FEF9E0',
    mushafInk: '#78350F',
    mushafBorder: '#F5C842',
  },
  {
    // Block 1 — Green
    bg: '#EDFAF3',
    border: '#3DBE7A',
    accent: '#16A34A',
    soft: '#DCFCE7',
    mushafBg: '#F5FDF8',
    mushafStripe: '#E8FAF0',
    mushafInk: '#14532D',
    mushafBorder: '#3DBE7A',
  },
  {
    // Block 2 — Blue
    bg: '#EAF3FF',
    border: '#5B9BF5',
    accent: '#1D4ED8',
    soft: '#DBEAFE',
    mushafBg: '#F0F6FF',
    mushafStripe: '#E5F0FF',
    mushafInk: '#1E3A8A',
    mushafBorder: '#5B9BF5',
  },
  {
    // Block 3 — Orange
    bg: '#FFF1EA',
    border: '#F5824A',
    accent: '#C2410C',
    soft: '#FED7AA',
    mushafBg: '#FFF8F2',
    mushafStripe: '#FEF0E4',
    mushafInk: '#7C2D12',
    mushafBorder: '#F5824A',
  },
];

const FOUR_COLORS_DARK: ReadonlyArray<BlockColor> = [
  {
    // Block 0 — Yellow Dark
    bg: '#332900', // very dark yellow background
    border: '#B38B22',
    accent: '#FCD34D',
    soft: '#4D3E00',
    mushafBg: '#1A1500',
    mushafStripe: '#261F00',
    mushafInk: '#FEF3C7', // light ink
    mushafBorder: '#B38B22',
  },
  {
    // Block 1 — Green Dark
    bg: '#002912',
    border: '#278051',
    accent: '#4ADE80',
    soft: '#003D1B',
    mushafBg: '#001A0B',
    mushafStripe: '#00220F',
    mushafInk: '#DCFCE7',
    mushafBorder: '#278051',
  },
  {
    // Block 2 — Blue Dark
    bg: '#001E42',
    border: '#3B6AAB',
    accent: '#60A5FA',
    soft: '#002D63',
    mushafBg: '#00132B',
    mushafStripe: '#001A3A',
    mushafInk: '#DBEAFE',
    mushafBorder: '#3B6AAB',
  },
  {
    // Block 3 — Orange Dark
    bg: '#331505',
    border: '#AB582F',
    accent: '#FB923C',
    soft: '#4D1F08',
    mushafBg: '#1A0B03',
    mushafStripe: '#260F04',
    mushafInk: '#FED7AA',
    mushafBorder: '#AB582F',
  },
];

const DEFAULT_BLUE_LIGHT: BlockColor = FOUR_COLORS_LIGHT[2]!;
const DEFAULT_BLUE_DARK: BlockColor = FOUR_COLORS_DARK[2]!;

const DEFAULT_TRANSPARENT_LIGHT: BlockColor = {
    bg: 'transparent',
    border: '#94A3B8', // slate-400
    accent: '#475569', // slate-600
    soft: '#F1F5F9', // slate-100
    mushafBg: 'transparent',
    mushafStripe: 'transparent',
    mushafInk: '#1A1209', // default dark ink
    mushafBorder: '#94A3B8',
};

const DEFAULT_TRANSPARENT_DARK: BlockColor = {
    bg: 'transparent',
    border: '#475569', // slate-600
    accent: '#94A3B8', // slate-400
    soft: '#1E293B', // slate-800
    mushafBg: 'transparent',
    mushafStripe: 'transparent',
    mushafInk: '#F8FAFC', // light ink
    mushafBorder: '#475569',
};

export function getBlockColor(index: number, mode: BlockColorMode = 'default', isDark: boolean = false): BlockColor {
    const safeIndex = index % 4;
    if (mode === 'four-colors') {
        return isDark ? FOUR_COLORS_DARK[safeIndex]! : FOUR_COLORS_LIGHT[safeIndex]!;
    }
    // Default mode: alternating blue / transparent
    if (safeIndex % 2 === 0) {
        return isDark ? DEFAULT_BLUE_DARK : DEFAULT_BLUE_LIGHT;
    }
    return isDark ? DEFAULT_TRANSPARENT_DARK : DEFAULT_TRANSPARENT_LIGHT;
}

export const BLOCK_COLORS = FOUR_COLORS_LIGHT; // kept for legacy reference if needed
