import { INDIRIM_TAVANI_ORANI } from '@/lib/campaigns/hesap'

/**
 * Havale/EFT ile ödeme (7 Kas 2026).
 *
 * NEDEN: iyzico üye işyeri, kapatılan eski şahıs firmasına (Nalan Bolat)
 * aitti. Satıcı artık İsa Bolat; onun adına başvurulan ödeme kuruluşları
 * (PayTR / Tosla) onaylanana dek sitedeki TEK ödeme yolu havale/EFT. Para
 * yalnız satıcının kendi hesabına alınır (alıcı adı = sitedeki satıcı adı).
 *
 * EK HAVALE İNDİRİMİ (BB kararı) — yasal çerçeve:
 *  - Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği (RG 33297, 1 Ağu
 *    2026'dan beri): indirimden önceki fiyat, son on günde aynı satış
 *    kanalında uygulanan en düşük fiyattır; şartlı kampanyalar da dahil.
 *    Havale tek ödeme yolu iken bu indirim fiilen HERKESE uygulanan fiyattır.
 *    Kasım indiriminden (11 Kasım 00.00) önce başlarsa 1–10 Kasım penceresinde
 *    daha düşük fiyattan satılmış olur ve 11 Kasım'daki üstü çizili fiyat
 *    yanıltıcı hâle gelir. Bu yüzden dönem panelden verilir ve kampanyayla
 *    aynı anda başlayıp kampanyayla biter.
 *  - Toplam indirim tavanı (%35, kampanya motoru) burada da aşılmaz.
 *  - Ürün kartında GÖSTERİLMEZ (BB: müşteri sepette ve ödeme adımında görsün).
 *
 * Bu dosya saf hesaptır (sunucu ve istemci aynı sonucu üretir); ayarın
 * okunması/yazılması `havaleAyari.ts`'te.
 */

export type HavaleAyari = {
  /** Banka adı — "Akbank" gibi. */
  banka: string
  /** Hesap sahibi — sitedeki satıcı adıyla aynı olmalı. */
  alici: string
  /** Boşluksuz, büyük harf TR IBAN. */
  iban: string
  /** Ek indirim yüzdesi (0 = yok). */
  indirimOrani: number
  /** ISO zaman; ikisi de doluysa indirim yalnız bu aralıkta uygulanır. */
  indirimBaslangic: string | null
  indirimBitis: string | null
}

/** Panelden girilebilecek en yüksek ek indirim (yanlış yazımı durdurur). */
export const HAVALE_INDIRIM_UST_SINIR = 20

const kurus = (n: number) => Math.round(n * 100) / 100

export function ibanTemizle(ham: string): string {
  return String(ham ?? '').replace(/\s+/g, '').toUpperCase()
}

/** TR IBAN: "TR" + 24 hane ve ISO 13616 mod-97 denetimi. */
export function ibanGecerliMi(ham: string): boolean {
  const iban = ibanTemizle(ham)
  if (!/^TR\d{24}$/.test(iban)) return false
  const yeniden = iban.slice(4) + iban.slice(0, 4)
  const sayisal = yeniden.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let kalan = 0
  for (const ch of sayisal) kalan = (kalan * 10 + Number(ch)) % 97
  return kalan === 1
}

/** "TR12 3456 …" — müşterinin okuyup karşılaştırabileceği biçim. */
export function ibanBicimle(ham: string): string {
  return ibanTemizle(ham).replace(/(.{4})/g, '$1 ').trim()
}

/** Havale ile sipariş alınabilir mi: banka, alıcı ve geçerli IBAN dolu. */
export function havaleHazirMi(a: HavaleAyari | null | undefined): a is HavaleAyari {
  return Boolean(a && a.banka.trim() && a.alici.trim() && ibanGecerliMi(a.iban))
}

export function havaleIndirimiAktifMi(a: HavaleAyari | null | undefined, simdi: Date): boolean {
  if (!a || !(a.indirimOrani > 0) || !a.indirimBaslangic || !a.indirimBitis) return false
  const bas = Date.parse(a.indirimBaslangic)
  const bit = Date.parse(a.indirimBitis)
  if (!Number.isFinite(bas) || !Number.isFinite(bit)) return false
  const t = simdi.getTime()
  return t >= bas && t <= bit
}

export type HavaleIndirimi = { oran: number; tutar: number }

/**
 * Ek havale indirimi: kampanya indirimi DÜŞÜLDÜKTEN sonraki tutar üzerinden
 * hesaplanır (%25 + %10 → toplam %32,5) ve toplam indirim tavanını aşamaz.
 */
export function havaleIndirimiHesapla(p: {
  araToplam: number
  kampanyaIndirimi: number
  ayar: HavaleAyari | null | undefined
  simdi: Date
}): HavaleIndirimi {
  if (!havaleHazirMi(p.ayar) || !havaleIndirimiAktifMi(p.ayar, p.simdi)) return { oran: 0, tutar: 0 }
  const oran = Math.min(HAVALE_INDIRIM_UST_SINIR, Math.max(0, Number(p.ayar.indirimOrani) || 0))
  const araToplam = Math.max(0, Number(p.araToplam) || 0)
  const kampanya = Math.min(araToplam, Math.max(0, Number(p.kampanyaIndirimi) || 0))
  const taban = araToplam - kampanya
  const istenen = kurus((taban * oran) / 100)
  const tavanKalan = kurus((araToplam * INDIRIM_TAVANI_ORANI) / 100 - kampanya)
  const tutar = Math.max(0, Math.min(istenen, tavanKalan))
  return { oran: tutar > 0 ? oran : 0, tutar }
}

/** Panelden gelen ham ayarı doğrular; hata varsa Türkçe mesaj döner. */
export function havaleAyariDogrula(ham: any): { ayar: HavaleAyari } | { hata: string } {
  const banka = String(ham?.banka ?? '').trim().slice(0, 60)
  const alici = String(ham?.alici ?? '').trim().slice(0, 100)
  const iban = ibanTemizle(ham?.iban ?? '')
  const indirimOrani = Number(ham?.indirimOrani ?? 0)
  const bas = ham?.indirimBaslangic ? String(ham.indirimBaslangic) : null
  const bit = ham?.indirimBitis ? String(ham.indirimBitis) : null

  if (!banka) return { hata: 'Banka adını yazın.' }
  if (!alici) return { hata: 'Hesap sahibinin adını yazın.' }
  if (!ibanGecerliMi(iban)) return { hata: 'IBAN geçersiz: TR ile başlayan 26 karakterlik numarayı kontrol edin.' }
  if (!Number.isFinite(indirimOrani) || indirimOrani < 0 || indirimOrani > HAVALE_INDIRIM_UST_SINIR) {
    return { hata: `Ek indirim 0 ile ${HAVALE_INDIRIM_UST_SINIR} arasında olmalı.` }
  }
  if (indirimOrani > 0) {
    if (!bas || !bit) return { hata: 'Ek indirim için başlangıç ve bitiş tarihini girin.' }
    const b = Date.parse(bas)
    const s = Date.parse(bit)
    if (!Number.isFinite(b) || !Number.isFinite(s) || s <= b) return { hata: 'Bitiş, başlangıçtan sonra olmalı.' }
  }
  return {
    ayar: {
      banka,
      alici,
      iban,
      indirimOrani,
      indirimBaslangic: indirimOrani > 0 ? new Date(Date.parse(bas!)).toISOString() : null,
      indirimBitis: indirimOrani > 0 ? new Date(Date.parse(bit!)).toISOString() : null,
    },
  }
}
