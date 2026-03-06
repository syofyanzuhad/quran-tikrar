import { ref, readonly } from 'vue'
import { db } from '../db'
import type { MushafPage, MushafLine, QuranWord, MushafPageBlock } from '../types/quran'

export function useMushafPage() {
  const currentPage = ref<number>(1)
  const pageData = ref<MushafPage | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // In-memory LRU cache
  const cache = new Map<number, MushafPage>()
  const MAX_CACHE = 5

  function setCached(pageNum: number, data: MushafPage) {
    if (cache.size >= MAX_CACHE) {
      if (!cache.has(pageNum)) {
        const firstKey = cache.keys().next().value
        if (firstKey !== undefined) {
           cache.delete(firstKey)
        }
      }
    }
    // Delete first to make it most recent if it existed
    cache.delete(pageNum)
    cache.set(pageNum, data)
  }

  function getCached(pageNum: number): MushafPage | undefined {
    if (cache.has(pageNum)) {
      const data = cache.get(pageNum)!
      // update LRU
      cache.delete(pageNum)
      cache.set(pageNum, data)
      return data
    }
    return undefined
  }

  function getBlockForLine(lineNumber: number): number {
    if (lineNumber >= 1 && lineNumber <= 4) return 0
    if (lineNumber >= 5 && lineNumber <= 8) return 1
    if (lineNumber >= 9 && lineNumber <= 12) return 2
    if (lineNumber >= 13 && lineNumber <= 15) return 3
    return 0 // Default fail-safe
  }

  async function buildMushafPage(pageNumber: number): Promise<MushafPage> {
    const rawWords = await db.getPageWords(pageNumber)
    
    if (!rawWords || rawWords.length === 0) {
        throw new Error(`Data not found for page ${pageNumber}`)
    }

    const wordsByLine = new Map<number, QuranWord[]>()
    for (const w of rawWords) {
        if (!wordsByLine.has(w.lineNumber)) {
            wordsByLine.set(w.lineNumber, [])
        }
        wordsByLine.get(w.lineNumber)!.push(w)
    }

    const lines: MushafLine[] = []
    
    // We expect exactly 15 lines max per page for standard Mushaf
    for (let i = 1; i <= 15; i++) {
        const words = wordsByLine.get(i) || []
        
        let isBismillah = false
        // Determine Bismillah handling by text sequence detection
        if (words.length > 0 && words.length <= 4) {
            const textString = words.map(w => w.textUthmani).join(' ').trim()
            if (textString.includes('بِسْمِ ٱللَّهِ') || textString.includes('بسم الله')) {
                isBismillah = true
            }
        }

        let isAyahEnd = false
        if (words.length > 0) {
             const lastWord = words[words.length - 1]
             if (lastWord && lastWord.charType === 'end') {
                 isAyahEnd = true
             }
        }

        lines.push({
            lineNumber: i,
            pageNumber,
            words,
            isBismillah,
            isAyahEnd,
            blockIndex: getBlockForLine(i)
        })
    }

    // Determine basic header metadata (using the first functional word available)
    let surahId = 1
    let juz = 1
    let hizb = 1
    let surahNameArabic = ''

    const validWord = rawWords.find(w => w.charType !== 'pause' && w.charType !== 'sajdah' && w.textUthmani)
    if (validWord) {
        surahId = validWord.surahId
        const surah = await db.surahs.get(surahId)
        if (surah) {
           surahNameArabic = surah.nameArabic
        }
        
        const ayah = await db.ayahs.get(validWord.ayahId)
        if (ayah) {
            juz = ayah.juz
            hizb = ayah.hizb
        } else {
             // Fallback lookup if ayah logic changes
             const anyAyah = await db.ayahs.where('page').equals(pageNumber).first()
             if (anyAyah) {
                 juz = anyAyah.juz
                 hizb = anyAyah.hizb
             }
        }
    }

    // Group blocks
    const blocks: MushafPageBlock[] = []
    const rangeConfigs = [
       { index: 0, start: 1, end: 4 },
       { index: 1, start: 5, end: 8 },
       { index: 2, start: 9, end: 12 },
       { index: 3, start: 13, end: 15 },
    ]

    for (const c of rangeConfigs) {
        const blockLines = lines.filter(l => l.lineNumber >= c.start && l.lineNumber <= c.end)
        
        // Find Ayah Range Display for UI string
        let startAyah = 0
        let endAyah = 0
        blockLines.forEach(l => {
           l.words.forEach(w => {
               if (w.charType !== 'end') return
               if (startAyah === 0 || w.verseNumber < startAyah) startAyah = w.verseNumber
               if (w.verseNumber > endAyah) endAyah = w.verseNumber
           })
        })
        
        const ayahRangeStr = (startAyah > 0) ? `${startAyah}–${endAyah > startAyah ? endAyah : startAyah}` : ''

        blocks.push({
            blockIndex: c.index,
            lineStart: c.start,
            lineEnd: c.end,
            lines: blockLines,
            ayahRange: ayahRangeStr
        })
    }

    return {
        pageNumber,
        juz,
        hizb,
        surahId,
        surahNameArabic,
        lines,
        blocks
    }
  }

  async function goToPage(pageNumber: number): Promise<void> {
    if (pageNumber < 1 || pageNumber > 604) return

    isLoading.value = true
    error.value = null
    currentPage.value = pageNumber

    try {
        const cached = getCached(pageNumber)
        if (cached) {
            pageData.value = cached
        } else {
            const built = await buildMushafPage(pageNumber)
            setCached(pageNumber, built)
            pageData.value = built
        }
        
        // Async background task
        prefetchAdjacent()
        
    } catch (e: any) {
        console.error('Failed to load mushaf page:', e)
        error.value = e.message || 'Gagal memuat halaman.'
        pageData.value = null
    } finally {
        isLoading.value = false
    }
  }

  function nextPage(): void {
     if (currentPage.value < 604) {
         void goToPage(currentPage.value + 1)
     }
  }

  function prevPage(): void {
     if (currentPage.value > 1) {
         void goToPage(currentPage.value - 1)
     }
  }

  async function prefetchAdjacent(): Promise<void> {
    const current = currentPage.value
    const targets = []
    if (current > 1) targets.push(current - 1)
    if (current < 604) targets.push(current + 1)

    for (const pageNum of targets) {
        if (!cache.has(pageNum)) {
            try {
                const data = await buildMushafPage(pageNum)
                setCached(pageNum, data)
            } catch (e) {
                // Silently ignore prefetch errors
            }
        }
    }
  }

  return {
    currentPage: readonly(currentPage),
    pageData: readonly(pageData),
    isLoading: readonly(isLoading),
    error: readonly(error),
    goToPage,
    nextPage,
    prevPage,
    prefetchAdjacent,
    getBlockForLine
  }
}
