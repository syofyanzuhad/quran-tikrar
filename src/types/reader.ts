export type BlockColorKey = 'yellow' | 'green' | 'blue' | 'orange'

export interface BlockColor {
  // App UI (vibrant)
  bg: string         // e.g. "#FFF8E7"
  border: string     // e.g. "#F5C842"
  accent: string     // darker shade for text
  soft: string       // very light for badges

  // Mushaf UI (aged paper tones)
  mushafBg: string       // parchment-tinted
  mushafStripe: string   // subtle line texture color
  mushafInk: string      // dark ink color for that block
  mushafBorder: string   // left border color on paper
}

export interface TikrarBlockUI {
  index: number         // 0–3
  colorKey: BlockColorKey
  color: BlockColor
  labelArabic: string   // "١" "٢" "٣" "٤"
  labelLatin: string    // "Blok 1" etc
  ayahIds: number[]
}

export type ReaderUIMode = 'app' | 'mushaf'
