import type { HesapKampanyasi } from './hesap'

/**
 * Kategori slug'ını görünen başlığa çeviren çözücü.
 *
 * Modül BİLEREK saf tutuldu (alias import yok) — kampanya bitiş simülasyonu
 * ve birim testleri bunu `node --experimental-strip-types` ile doğrudan
 * import edebilsin diye. Kategori başlığı dışarıdan geçilir; geçilmezse
 * slug'ın ilk harfi büyütülür.
 */
export type KategoriCozucu = (slug: string) => string | undefined

/**
 * Vitrin bandının müşteriye görünen metni ve tıklama hedefi (Faz 20 acil).
 *
 * BOZUKLUK: bant kampanyanın PANEL ADINI basıyordu. Canlıda "İKİNCİ SİPARİŞ
 * KUPONU" yazıyordu — ne açıklama, ne oran, ne kod, ne bağlantı. Panel adı
 * operatör için bir etikettir, müşteriye gösterilecek bir cümle değil.
 *
 * Metin sırası: kampanyanın `banner_text` alanı (panelden yazılır) → yoksa
 * tip + değer + kapsamdan üretilen akıllı varsayılan. Panel adına ASLA
 * düşülmez; ad boş bir metinden bile daha yanıltıcıdır.
 *
 * Saf modül: panel formundaki canlı önizleme de bunu çağırır, böylece
 * "vitrinde şöyle görünecek" satırı gerçeğin ta kendisi olur.
 */

const TL = (n: number) =>
  `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n)}₺`

/**
 * Sayıya yönelme hâli eki: %25'E, %30'A, %20'YE…
 * "%25'a varan" gibi kulak tırmalayan metinler çıkmasın diye okunuşa göre
 * seçiliyor (yirmi beş → "beş" → e; otuz → a; yirmi → ye).
 */
function yonelmeEki(n: number): string {
  const yuz = Math.abs(Math.round(n))
  const onlar: Record<number, string> = {
    10: "'a", 20: "'ye", 30: "'a", 40: "'a", 50: "'ye",
    60: "'a", 70: "'e", 80: "'e", 90: "'a", 100: "'e",
  }
  if (yuz % 10 === 0 && onlar[yuz]) return onlar[yuz]
  const birler: Record<number, string> = {
    1: "'e", 2: "'ye", 3: "'e", 4: "'e", 5: "'e",
    6: "'ya", 7: "'ye", 8: "'e", 9: "'a",
  }
  return birler[yuz % 10] ?? "'e"
}

/** Kapsam ifadesi: "Tüm ürünlerde", "Kolye kategorisinde"… */
function kapsamIfadesi(k: HesapKampanyasi, kategoriAdi?: KategoriCozucu): string {
  if (k.kapsam === 'stok') return 'Stoğu azalan ürünlerde'
  if (k.kapsam === 'fiyat_araligi') return 'Seçili fiyat aralığında'
  if (k.kapsam === 'sepet' || k.hedefler.length === 0) return 'Tüm ürünlerde'
  if (k.hedefler.length > 1) return 'Seçili ürünlerde'
  const hedef = k.hedefler[0]
  if (k.kapsam === 'kategori') {
    // Kategori başlığı menüyle aynı kaynaktan; slug'ı büyük harfe çevirmek
    // "Kupe kategorisinde" gibi Türkçesi bozuk metinler üretiyordu.
    const ad = kategoriAdi?.(hedef) || hedef.charAt(0).toLocaleUpperCase('tr-TR') + hedef.slice(1)
    return `${ad} kategorisinde`
  }
  if (k.kapsam === 'koleksiyon') return 'Seçili koleksiyonda'
  return 'Seçili üründe'
}

/** "500₺ üzeri" gibi koşul öneki — koşulsuzsa boş. */
function kosulOneki(k: HesapKampanyasi): string {
  if (k.minSepet > 0) return `${TL(k.minSepet)} üzeri `
  if (k.minAdet > 1) return `${k.minAdet} ürün alana `
  return ''
}

/**
 * Akıllı varsayılan metin — banner_text boşsa kullanılır.
 * Boş dönerse bant hiç basılmaz (yanlış bir şey yazmaktansa hiç yazma).
 */
export function vitrinMetniUret(k: HesapKampanyasi, kategoriAdi?: KategoriCozucu): string {
  const kapsam = kapsamIfadesi(k, kategoriAdi)
  const kosul = kosulOneki(k)

  switch (k.tip) {
    case 'sepet_yuzde':
    case 'kapsam_yuzde': {
      if (!k.deger) return ''
      return `${kosul}${kapsam.toLocaleLowerCase('tr-TR')} %${k.deger} indirim`
        .replace(/^(.)/, (c) => c.toLocaleUpperCase('tr-TR'))
    }
    case 'sepet_sabit':
    case 'kapsam_sabit': {
      if (!k.deger) return ''
      return `${kosul}${kapsam.toLocaleLowerCase('tr-TR')} ${TL(k.deger)} indirim`
        .replace(/^(.)/, (c) => c.toLocaleUpperCase('tr-TR'))
    }
    case 'x_al_y_ode': {
      if (!k.alAdet || !k.odeAdet) return ''
      return `${kapsam} ${k.alAdet} al ${k.odeAdet} öde`
    }
    case 'kademeli': {
      const enYuksek = (k.kademeler ?? []).reduce((m, t) => Math.max(m, t.oran || 0), 0)
      if (!enYuksek) return ''
      const enDusukEsik = (k.kademeler ?? [])
        .map((t) => t.minTutar)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)[0]
      const ek = yonelmeEki(enYuksek)
      return enDusukEsik
        ? `${TL(enDusukEsik)} üzeri %${enYuksek}${ek} varan indirim`
        : `%${enYuksek}${ek} varan indirim`
    }
    case 'ucretsiz_kargo':
      // Kargo zaten koşulsuz ücretsiz; bunu kampanya diye duyurmak
      // müşteriye yeni bir şey söylemez.
      return ''
    default:
      return ''
  }
}

/** Bandın tıklama hedefi — kapsamı olan kampanyada ilgili sayfaya götürür. */
export function vitrinHedefi(k: HesapKampanyasi): string {
  if (k.kapsam === 'kategori' && k.hedefler.length === 1) return `/kategori/${k.hedefler[0]}`
  if (k.kapsam === 'koleksiyon' && k.hedefler.length === 1) return `/koleksiyon/${k.hedefler[0]}`
  return '/urunler'
}

/** Panelden yazılan metin varsa o, yoksa akıllı varsayılan. Panel adına düşmez. */
export function vitrinMetni(
  k: HesapKampanyasi,
  bannerText: string | null | undefined,
  kategoriAdi?: KategoriCozucu
): string {
  const elle = (bannerText ?? '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return elle || vitrinMetniUret(k, kategoriAdi)
}
