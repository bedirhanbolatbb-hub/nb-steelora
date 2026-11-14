/**
 * İmzalı e-Arşiv faturası ↔ Trendyol paketi eşleşme denetimi (14 Kas 2026).
 *
 * BB'nin şartı: yanlış siparişe fatura ASLA yüklenmez. Başkasının faturası, o
 * kişinin adını ve adresini üçüncü kişiye vermek demektir; bunun cezai
 * sonucu var. Bu yüzden yükleme tek bir bağa (nottaki sipariş numarası)
 * güvenmez. Aşağıdakilerin HEPSİ geçmezse fatura yüklenmez, BB'ye "elle
 * bakılacak" diye bildirilir (kapalı başarısızlık):
 *
 *  1. Belge imzalı ("Onaylandı"). Numarası Trendyol'un istediği biçimde
 *     (3 harf/rakam + 13 rakam); listedeki numara ve ETTN ile ayrıntıdaki aynı.
 *  2. Belgenin notunda TEK bir sipariş numarası var ve o, paketin numarası.
 *  3. Paketten şimdi yeniden hazırlanan fatura (taslak.ts — taslağı açan aynı
 *     hesap) ile GİB'deki belge alan alan aynı: fatura tipi, para birimi,
 *     alıcı VKN/TCKN, adı, soyadı, unvanı (listedeki "Alıcı" sütunu da),
 *     kalem sayısı, her kalemin adı ve miktarı, ödenecek tutar (kuruşu
 *     kuruşuna) ve Trendyol'un faturalanacak tutarı (KDV yuvarlaması: satır
 *     başına en çok 1 kuruş).
 *  4. Fatura tarihi siparişten önce değil, gelecekte değil.
 * Bir alan okunamıyorsa denetim geçmez.
 *
 * Görüntü (GİB'in HTML'i) ayrıca belge numarasını ve ETTN'yi taşımalı; yani
 * yayımlanan sayfa, denetlenen belgenin kendisi olmalı.
 *
 * Saf fonksiyonlar; ağ, veritabanı, ortam değişkeni yok.
 */
import { taslakHazirla, type TrendyolPaket } from './taslak'

/** GİB listesindeki bir belge + ayrıntısı (EARSIV_PORTAL_FATURA_GETIR). */
export interface GibKaydi {
  ettn: string
  belge: string
  onay: string
  aliciVknTckn: string
  aliciUnvanAdSoyad: string
  detay: Record<string, unknown>
}

export type DenetimSonucu =
  | { tamam: true; belgeNumarasi: string; faturaZamani: number; tutar: number }
  | { tamam: false; neden: string }

export const IMZALI = 'Onaylandı'
const BELGE_NO = /^[A-Z0-9]{3}\d{13}$/
const SIPARIS_NOLARI = /(?:SİPARİŞ NO|Sipariş No|sipariş no)\s*:?\s*(\d{8,})/g
const GUN_MS = 86_400_000
const TR_FARK_MS = 3 * 3_600_000 // Türkiye 2016'dan beri sürekli UTC+3

/**
 * Ad karşılaştırması: boşluk ve büyük/küçük harf farkı yok sayılır. I/İ/ı/i
 * dörtlüsü tek harfe indirilir (GİB'in büyük harfe çevirmesi dile göre
 * değişebiliyor); başka hiçbir harf (Ş, Ğ, Ü, Ö, Ç) gevşetilmez.
 */
export function adAnahtari(s: unknown): string {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[İI]/g, 'I')
}

/** "120", 120, "120.00", "1.268,40" → sayı; okunamazsa NaN. */
export function tutarOku(x: unknown): number {
  if (typeof x === 'number') return Number.isFinite(x) ? x : NaN
  const s = String(x ?? '').trim()
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'))
  if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(',', '.'))
  return NaN
}

/** Nottaki bütün sipariş numaraları. */
export function nottakiSiparisler(not: unknown): string[] {
  return [...String(not ?? '').matchAll(SIPARIS_NOLARI)].map((m) => m[1])
}

/** "gg/aa/yyyy" + "ss:dd:sn" (İstanbul) → epoch ms; okunamazsa NaN. */
export function istanbulZamani(tarih: unknown, saat: unknown): number {
  const t = String(tarih ?? '').match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/)
  if (!t) return NaN
  const s = String(saat ?? '').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  const [sa, dk, sn] = s ? [Number(s[1]), Number(s[2]), Number(s[3] ?? 0)] : [0, 0, 0]
  if (sa > 23 || dk > 59 || sn > 59) return NaN
  return Date.UTC(Number(t[3]), Number(t[2]) - 1, Number(t[1]), sa, dk, sn) - TR_FARK_MS
}

const red = (neden: string): DenetimSonucu => ({ tamam: false, neden })

/**
 * Paket ile GİB belgesini karşılaştırır. `imzaSarti` yalnız panel önizlemesinde
 * kapatılır (imzasız taslağın görüntüsüne bakmak için); yüklemede hep açık.
 */
export function yuklemeDenetimi(
  paket: TrendyolPaket,
  k: GibKaydi,
  simdi: Date,
  imzaSarti = true
): DenetimSonucu {
  const no = String(paket.orderNumber ?? '')
  const d = k.detay ?? {}

  if (imzaSarti && k.onay !== IMZALI) return red('fatura imzalı değil')
  if (!BELGE_NO.test(k.belge)) return red('belge numarası Trendyol biçiminde değil')
  if (String(d.belgeNumarasi ?? '') !== k.belge) return red('belge numarası listeyle ayrıntıda farklı')
  if (String(d.faturaUuid ?? '').toLowerCase() !== k.ettn.toLowerCase()) return red('ETTN listeyle ayrıntıda farklı')
  if (!Number.isSafeInteger(paket.id) || Number(paket.id) <= 0) return red('Trendyol paket numarası okunamadı')

  const nolar = nottakiSiparisler(d.not)
  if (nolar.length !== 1) return red(`fatura notunda ${nolar.length} sipariş numarası var (tek olmalı)`)
  if (nolar[0] !== no) return red('fatura notundaki sipariş numarası farklı')

  const an = { tarih: '01/01/2000', saat: '00:00:00' } // tarih karşılaştırılmıyor
  const beklenen = taslakHazirla(paket, an)
  if (!beklenen.tamam) return red(`sipariş şu an faturalanamıyor: ${beklenen.neden}`)
  const b = beklenen.jp

  if (String(d.faturaTipi ?? '') !== String(b.faturaTipi)) return red('fatura tipi siparişle uyuşmuyor')
  if (String(d.paraBirimi ?? '') !== 'TRY') return red('para birimi TL değil')

  const vkn = String(d.vknTckn ?? '').replace(/\D/g, '')
  if (vkn !== String(b.vknTckn) || k.aliciVknTckn.replace(/\D/g, '') !== vkn) {
    return red('alıcı vergi/kimlik numarası uyuşmuyor')
  }
  for (const alan of ['aliciUnvan', 'aliciAdi', 'aliciSoyadi'] as const) {
    if (adAnahtari(d[alan]) !== adAnahtari(b[alan])) return red('alıcı adı uyuşmuyor')
  }
  const beklenenAd = adAnahtari(String(b.aliciUnvan) || `${b.aliciAdi} ${b.aliciSoyadi}`)
  if (adAnahtari(k.aliciUnvanAdSoyad) !== beklenenAd) return red('listedeki alıcı adı uyuşmuyor')

  const kalemler = Array.isArray(d.malHizmetTable) ? (d.malHizmetTable as Record<string, unknown>[]) : []
  const beklenenKalemler = b.malHizmetTable as Record<string, unknown>[]
  if (kalemler.length !== beklenenKalemler.length) return red('kalem sayısı uyuşmuyor')
  for (let i = 0; i < kalemler.length; i++) {
    if (adAnahtari(kalemler[i]?.malHizmet) !== adAnahtari(beklenenKalemler[i].malHizmet)) {
      return red(`${i + 1}. kalemin ürün adı uyuşmuyor`)
    }
    if (tutarOku(kalemler[i]?.miktar) !== Number(beklenenKalemler[i].miktar)) {
      return red(`${i + 1}. kalemin miktarı uyuşmuyor`)
    }
  }

  const tutar = tutarOku(d.odenecekTutar)
  if (!Number.isFinite(tutar) || Math.abs(tutar - beklenen.toplam) > 0.005) return red('ödenecek tutar uyuşmuyor')
  const faturalanacak = Number(paket.totalPrice)
  if (!Number.isFinite(faturalanacak) || Math.abs(tutar - faturalanacak) > 0.01 * kalemler.length + 1e-9) {
    return red('tutar Trendyol\'un faturalanacak tutarını tutmuyor')
  }

  const faturaZamani = istanbulZamani(d.faturaTarihi, d.saat)
  if (!Number.isFinite(faturaZamani)) return red('fatura tarihi okunamadı')
  if (faturaZamani > simdi.getTime() + 5 * 60_000) return red('fatura tarihi gelecekte')
  const siparisZamani = Number(paket.orderDate)
  if (!Number.isFinite(siparisZamani) || siparisZamani <= 0) return red('sipariş tarihi okunamadı')
  // Trendyol'un orderDate'i saat dilimi kayması taşıyabiliyor; bir gün pay.
  if (faturaZamani < siparisZamani - GUN_MS) return red('fatura tarihi siparişten önce')

  return { tamam: true, belgeNumarasi: k.belge, faturaZamani, tutar }
}

/** Yayımlanacak görüntü denetlenen belgenin kendisi mi: numara ve ETTN içinde geçmeli. */
export function goruntuBelgeyleUyumlu(html: string, belge: string, ettn: string): boolean {
  return (
    typeof html === 'string' &&
    html.length > 1000 &&
    /<html/i.test(html) &&
    html.includes(belge) &&
    html.toLowerCase().includes(ettn.toLowerCase())
  )
}
