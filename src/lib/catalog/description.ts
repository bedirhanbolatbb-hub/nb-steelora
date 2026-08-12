/**
 * Pazaryeri açıklamasını okunur hâle getirir — YALNIZCA görüntüleme katmanı.
 * Hiçbir sonuç DB'ye yazılmaz; trendyol_description ham hâliyle korunur.
 *
 * Ham metin iç içe boş div'ler, <br> yığınları, emoji span'ları ve
 * "Öne Çıkan Özellikler:" gibi pazaryeri kalıpları içeriyor.
 */

export type CleanDescription = {
  paragraphs: string[]
  bullets: string[]
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&rsquo;': '’',
  '&hellip;': '…',
}

// Pazaryeri kalıpları — tek başına satır oluşturduklarında atılır.
const BOILERPLATE = [
  /^öne çıkan özellikler:?$/i,
  /^ürün özellikleri:?$/i,
  /^özellikler:?$/i,
  /^açıklama:?$/i,
  /^hızlı (ve güvenli )?kargo!?$/i,
  /^aynı gün kargo!?$/i,
  /^stokla(rımız)? sınırlıdır!?$/i,
  /^mağazamızı takip ed(in|iniz)!?$/i,
  /^trendyol$/i,
]

function decodeEntities(text: string): string {
  return text.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
}

function stripEmoji(text: string): string {
  // Emoji ve süs sembolleri; Türkçe harfler etkilenmez.
  return text.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/gu,
    ''
  )
}

function toLines(html: string): string[] {
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(stripEmoji(withBreaks))
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
}

function isJunk(line: string): boolean {
  if (line.length < 3) return true
  // Yalnız noktalama/süs karakterinden ibaret satırlar
  if (!/[a-zçğıöşüA-ZÇĞİÖŞÜ0-9]/.test(line)) return true
  return BOILERPLATE.some((pattern) => pattern.test(line))
}

/**
 * @param raw trendyol_description (ham HTML)
 * @returns paragraflar + madde listesi; içerik yoksa ikisi de boş
 */
export function cleanDescription(raw: string | null | undefined): CleanDescription {
  if (!raw) return { paragraphs: [], bullets: [] }

  const paragraphs: string[] = []
  const bullets: string[] = []
  let previous = ''

  for (const line of toLines(raw)) {
    if (isJunk(line)) continue
    if (line === previous) continue
    previous = line

    const bulletMatch = line.match(/^[•·*\-–]\s*(.+)$/)
    if (bulletMatch) {
      const text = bulletMatch[1].trim()
      if (text && !bullets.includes(text)) bullets.push(text)
      continue
    }

    if (!paragraphs.includes(line)) paragraphs.push(line)
  }

  return { paragraphs, bullets }
}

export function hasContent(description: CleanDescription): boolean {
  return description.paragraphs.length > 0 || description.bullets.length > 0
}
