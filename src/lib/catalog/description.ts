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

/**
 * Malzeme beyanı yalnız tek kanonik yerde durur: başlık altı satır ve
 * "Malzeme & Bakım" sekmesi (lib/catalog/material.ts). Açıklama metnindeki
 * malzeme cümleleri buradan ayıklanır — aksi hâlde çelik ürünün açıklamasında
 * "pirinçtir" yazan çelişkiler ekranda kalıyor.
 */
const MATERIAL_SENTENCES = [
  /ürün(ün)? materyali/i,
  /materyali\s*:?\s*(pirinç|çelik)/i,
  /(pirinçtir|çeliktir)\.?$/i,
  /malzemeden üretilmiştir/i,
  /^\s*\(?316l\)?\s*paslanmaz çelik\b/i,
  /paslanmaz çelik malzeme/i,
  /ürün zinciri/i,
]

/**
 * DOĞRULANAMAZ ÜRETİM/TASARIM İDDİALARI (5 Eyl 2026, Merchant Center denetimi).
 *
 * Tedarikçiden gelen şablon metin 280 üründen 246'sında "NB Steelora'nın özel
 * tasarımıyla hazırlanmış" diyordu. Ürünler hazır alınıp kendi markamız altında
 * satılıyor; tasarım iddiası doğru değil ve Google'ın "yanlış beyan" politikası
 * tam olarak bunu kapsıyor. İddia cümleden çıkarılır, kalan metin korunur.
 *
 * "bu premium çelik kolye" gibi malzeme sıfatları da atılır: malzeme tek
 * kanonik yerde (başlık altı satır + g:material) yazar ve katalogda kaplama
 * pirinç ürünler de var — açıklamada "çelik" demek onlarda yanlış olurdu.
 */
const IDDIA_DESENLERI: [RegExp, string][] = [
  [/\s*NB\s*Steelora['’`]?n[ıi]n\s+özel\s+tasarım(ı|ıyla|ımızla)\s+(hazırlanmış|üretilmiş)\s*/gi, ' '],
  [/\s*özel\s+tasarım(ı|ıyla|ımızla)\s+(hazırlanmış|üretilmiş)\s*/gi, ' '],
  [/\s*kendi\s+(üretimimiz\w*|atölyemizde\s+üretilen)\s*/gi, ' '],
  [/\s*el\s+işçiliğiyle\s+üretilen\s*/gi, ' '],
  [/\s*Her\s+detayında\s+ince\s+işçilik\s+barındıran\s+/gi, ''],
  [/\bbu\s+premium\s+(çelik|altın|gümüş)\s+/gi, 'bu '],
]

export function iddiaTemizle(line: string): string {
  let text = line
  for (const [desen, yerine] of IDDIA_DESENLERI) text = text.replace(desen, yerine)
  return text.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim()
}

/** Kargo & İade sekmesinin zaten kapsadığı pazaryeri cümleleri. */
const POLICY_SENTENCES = [
  /hijyenik nedenlerle/i,
  /sadece hasarlı,? yanlış veya eksik gönderim/i,
  /sipariş vermeden önce açıklamayı dikkatle okuyunuz/i,
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

function toLines(raw: string): string[] {
  const isHtml = /<[a-z!/]/i.test(raw)

  // Ürünlerin bir kısmında açıklama HTML değil, ";" ve "•" ile ayrılmış düz
  // metin geliyor; bunlar da paragraf/madde satırlarına bölünür.
  const withBreaks = isHtml
    ? raw
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
        .replace(/<\s*li[^>]*>/gi, '\n• ')
        .replace(/<[^>]+>/g, ' ')
    : raw.replace(/\s*;\s*/g, '\n').replace(/\s+•\s*/g, '\n• ')

  return decodeEntities(stripEmoji(withBreaks))
    .split('\n')
    .map((line) => cleanFragments(line))
}

/** Bölme sonrası ortada kalan parantez kırıntılarını toparlar. */
function cleanFragments(line: string): string {
  let text = line.replace(/\s+/g, ' ').trim()
  // Kapanmayan açılış parantezi: "(Bazı tenlerin …" → parantez atılır
  if (text.startsWith('(') && !text.includes(')')) text = text.slice(1).trim()
  // Baştaki yetim kapanış: ") • Şık kutusunda …" → atılır
  text = text.replace(/^\)\s*/, '').trim()
  // İçi boş parantezler
  text = text.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim()
  return text
}

function isJunk(line: string): boolean {
  // Madde işareti önekini SOY: kalıp desenlerinin çoğu satır başına bağlı ve
  // "• 316L paslanmaz çelik …" satırı bu yüzden süzgeçten kaçıyordu.
  line = line.replace(/^[•·*\-–]\s*/, '')
  if (line.length < 3) return true
  // Yalnız noktalama/süs karakterinden ibaret satırlar
  if (!/[a-zçğıöşüA-ZÇĞİÖŞÜ0-9]/.test(line)) return true
  if (BOILERPLATE.some((pattern) => pattern.test(line))) return true
  if (MATERIAL_SENTENCES.some((pattern) => pattern.test(line))) return true
  if (POLICY_SENTENCES.some((pattern) => pattern.test(line))) return true
  return false
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

  for (const ham of toLines(raw)) {
    const line = iddiaTemizle(ham)
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
