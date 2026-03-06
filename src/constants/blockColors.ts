import type { BlockColor } from '../types/reader'

export const BLOCK_COLORS: ReadonlyArray<BlockColor> = [
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
] as const
