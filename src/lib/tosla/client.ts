// ─── TOSLA İŞİM SANAL POS — İSTEMCİ (12 Kasım 2026) ─────────────────────────
//
// Satıcı firmanın kart tahsilatı Tosla İşim (Akbank iştiraki AKÖde) üzerinden.
// KarPanel'de 12 Kas 2026'da canlı 1 TL denemeyle doğrulanan istemcinin aynısı.
// Kaynak: tosla.com/isim-icin/gelistirici-merkezi ve aynı sayfadaki Postman
// koleksiyonu. Yalnız sunucu.
//
// ═══ AKIŞ — ORTAK ÖDEME SAYFASI ════════════════════════════════════════════
//   1. threeDPayment → ThreeDSessionId (her deneme için YENİ oturum).
//   2. Müşteri <taban>threeDSecure/<oturum> sayfasına gider; kartı Tosla'nın
//      sayfasında girer, bankanın 3D adımını geçer. Kart bilgisi sitemize
//      HİÇ gelmez (eski iyzico akışında kart numarası bizim formumuzdan
//      geçiyordu).
//   3. Tosla sonucu müşterinin tarayıcısı üzerinden CallbackUrl'e POST eder.
//   4. KARAR DÖNÜŞTEN DEĞİL SORGUDAN: dönüş yalnız "şu sipariş bitti" der.
//      Tutar ve durum sunucudan sunucuya `inquiry` ile okunur; dönüşün imzası
//      da doğrulanır ama tek dayanak o değildir. Dönüşü taklit eden biri,
//      ödenmemiş bir siparişi sorguya "ödendi" dedirtemez.
//
// ═══ KİMLİK ════════════════════════════════════════════════════════════
// TOSLA_CLIENT_ID · TOSLA_API_USER · TOSLA_API_PASS — Vercel ortam
// değişkenleri. BB panelden SMS ile alıp kendisi girer; koda, kayda, yanıta
// asla yazılmaz. TOSLA_ORTAM=test → deneme ortamı. Kart ödemesi ayrıca
// TOSLA_ODEME_ACIK=evet ister (bkz. kartOdemesiKimligi).
//
// ═══ İMZA ══════════════════════════════════════════════════════════════
// Her istek: Base64(SHA512(ApiPass + ClientId + ApiUser + Rnd + TimeSpan)).
// TimeSpan Türkiye saatiyle yyyyMMddHHmmss; Tosla ±1 saat kabul ediyor ve
// her imza BİR KEZ kullanılabiliyor — rnd her istekte yeniden üretilir.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const TOSLA_TABAN = {
  test:  'https://prepentegrasyon.tosla.com/api/Payment/',
  canli: 'https://entegrasyon.tosla.com/api/Payment/',
} as const

export type ToslaOrtam = keyof typeof TOSLA_TABAN

export interface ToslaKimlik {
  ortam:    ToslaOrtam
  clientId: string
  apiUser:  string
  apiPass:  string
}

/** TL para birimi kodu (ISO 4217 sayısal). */
export const TOSLA_TL = 949

/** Tosla'nın sipariş numarası sınırı. */
export const SIPARIS_NO_UZUNLUK_SINIRI = 20

export class ToslaHatasi extends Error {
  constructor(
    message: string,
    /** Tosla'nın `Code` değeri (varsa). */
    readonly kod?: number,
    /** Yeniden denemek anlamlı mı (ağ, zaman aşımı, 5xx, 999 genel hata). */
    readonly gecici = false,
  ) {
    super(message)
    this.name = 'ToslaHatasi'
  }
}

/** Ortam değişkenlerinden kimlik. Eksik ya da biçimsizse null — çağıran kartı açmaz. */
export function toslaKimligi(env: Record<string, string | undefined> = process.env): ToslaKimlik | null {
  const clientId = env.TOSLA_CLIENT_ID?.trim()
  const apiUser  = env.TOSLA_API_USER?.trim()
  // Parola KIRPILMAZ (anlamlı karakter olabilir); yalnız yapıştırmadan kalan satır sonu atılır.
  const apiPass  = env.TOSLA_API_PASS?.replace(/[\r\n]+$/, '')
  if (!clientId || !apiUser || !apiPass) return null
  // clientId JSON'da SAYI gidiyor (long); güvenli tamsayı aralığının dışı yazılamaz.
  if (!/^\d{1,15}$/.test(clientId)) return null
  const ortam: ToslaOrtam = env.TOSLA_ORTAM?.trim() === 'test' ? 'test' : 'canli'
  return { ortam, clientId, apiUser, apiPass }
}

/**
 * Kart ödemesi açık mı — iki koşul birden: TOSLA_ODEME_ACIK=evet VE kimlik
 * tam. Biri eksikse null: ödeme sayfası kart seçeneğini göstermez, başlatma
 * ucu 503 döner. Anahtarlar girilip anahtar açılmadan müşteri karta yönelmez.
 */
export function kartOdemesiKimligi(env: Record<string, string | undefined> = process.env): ToslaKimlik | null {
  if (env.TOSLA_ODEME_ACIK?.trim() !== 'evet') return null
  return toslaKimligi(env)
}

/**
 * Sitedeki her "kartla ödeme" seçeneği ve metni bu tek soruya bakar
 * (ödeme ekranı, sepet, SSS, llms.txt). Ortam değişkeni değişince Vercel
 * yeni yayın açar; bu yüzden derleme anında okunan sayfalar da çalışma
 * anındakiyle aynı cevabı verir.
 */
export function kartOdemesiAcikMi(env: Record<string, string | undefined> = process.env): boolean {
  return kartOdemesiKimligi(env) !== null
}

/** yyyyMMddHHmmss — Türkiye saati (Tosla GMT+3 istiyor). */
export function toslaZamani(an: Date = new Date()): string {
  const parca = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(an)
  const al = (t: Intl.DateTimeFormatPartTypes) => parca.find(p => p.type === t)?.value ?? '00'
  return `${al('year')}${al('month')}${al('day')}${al('hour')}${al('minute')}${al('second')}`
}

export function sha512Base64(metin: string): string {
  return createHash('sha512').update(metin, 'utf8').digest('base64')
}

/** İstek imzası — belge: ApiPass + ClientId + ApiUser + Rnd + TimeSpan. */
export function istekImzasi(k: ToslaKimlik, rnd: string, timeSpan: string): string {
  return sha512Base64(k.apiPass + k.clientId + k.apiUser + rnd + timeSpan)
}

/** İstek başına rastgele değer (Tosla sınırı 24 karakter). */
export function rastgeleDeger(kaynak: (n: number) => Buffer = randomBytes): string {
  return kaynak(9).toString('hex')   // 18 karakter
}

/** TL tutarı → kuruş (Tosla: son iki hane kuruş). */
export function kurusa(tutarTl: number): number {
  return Math.round(tutarTl * 100)
}

// ─── Yanıt okuma — Tosla alan adlarını bazen PascalCase, bazen camelCase döner ──
type Kayit = Record<string, unknown>

export function alan(v: Kayit, ad: string): unknown {
  if (ad in v) return v[ad]
  const kucuk = ad.toLowerCase()
  const k = Object.keys(v).find(x => x.toLowerCase() === kucuk)
  return k === undefined ? undefined : v[k]
}
function metin(v: Kayit, ad: string): string | null {
  const x = alan(v, ad)
  return x === undefined || x === null || x === '' ? null : String(x)
}
function sayi(v: Kayit, ad: string): number | null {
  const x = alan(v, ad)
  if (x === undefined || x === null || x === '') return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

/** Tek istek: kimlik alanları + imza eklenir, JSON gönderilir, JSON okunur. */
export async function toslaIstegi(
  k: ToslaKimlik,
  yontem: string,
  alanlar: Kayit,
  fetchImpl: FetchImpl = fetch,
): Promise<Kayit> {
  const rnd = rastgeleDeger()
  const timeSpan = toslaZamani()
  const govde = {
    clientId: Number(k.clientId), apiUser: k.apiUser, rnd, timeSpan,
    hash: istekImzasi(k, rnd, timeSpan),
    ...alanlar,
  }
  let yanit: Response
  try {
    yanit = await fetchImpl(TOSLA_TABAN[k.ortam] + yontem, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(govde),
      signal:  AbortSignal.timeout(20_000),
      cache:   'no-store',
    })
  } catch (e) {
    throw new ToslaHatasi(`Tosla'ya ulaşılamadı (${yontem}): ${e instanceof Error ? e.message : String(e)}`, undefined, true)
  }
  const ham = await yanit.text()
  try {
    const v = JSON.parse(ham) as unknown
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('nesne değil')
    return v as Kayit
  } catch {
    throw new ToslaHatasi(`Tosla yanıtı okunamadı (${yontem}, HTTP ${yanit.status})`, undefined, yanit.status >= 500)
  }
}

function kodKontrol(v: Kayit, ne: string): void {
  const kod = sayi(v, 'Code')
  if (kod !== 0) {
    const mesaj = metin(v, 'Message') ?? ''
    throw new ToslaHatasi(`${ne}: Tosla kodu ${kod ?? '?'}${mesaj ? ` — ${mesaj}` : ''}`, kod ?? undefined, kod === 999 || kod === null)
  }
}

// ─── 1. Ödeme oturumu ─────────────────────────────────────────────────────
export async function odemeOturumuAc(
  k: ToslaKimlik,
  a: { siparisNo: string; tutarKurus: number; aciklama: string; donusAdresi: string },
  fetchImpl?: FetchImpl,
): Promise<{ oturumId: string; islemNo: string | null }> {
  if (!Number.isInteger(a.tutarKurus) || a.tutarKurus <= 0) throw new ToslaHatasi('Tutar geçersiz')
  if (a.siparisNo.length > SIPARIS_NO_UZUNLUK_SINIRI) throw new ToslaHatasi('Sipariş numarası 20 karakteri aşıyor')
  const v = await toslaIstegi(k, 'threeDPayment', {
    orderId:          a.siparisNo,
    amount:           a.tutarKurus,
    currency:         TOSLA_TL,
    installmentCount: 0,
    callbackUrl:      a.donusAdresi,
    description:      a.aciklama.slice(0, 256),
  }, fetchImpl)
  kodKontrol(v, 'Ödeme oturumu açılamadı')
  const oturumId = metin(v, 'ThreeDSessionId')
  if (!oturumId) throw new ToslaHatasi('Ödeme oturumu açılamadı: oturum numarası dönmedi', undefined, true)
  return { oturumId, islemNo: metin(v, 'TransactionId') }
}

/** Müşterinin gideceği Tosla ödeme sayfası. */
export function ortakOdemeSayfasi(k: ToslaKimlik, oturumId: string): string {
  return `${TOSLA_TABAN[k.ortam]}threeDSecure/${encodeURIComponent(oturumId)}`
}

// ─── 2. Sorgu — kararın tek dayanağı ─────────────────────────────────────
export type ToslaDurum = 'odendi' | 'bekliyor' | 'basarisiz' | 'iptal' | 'iade' | 'itiraz' | 'bulunamadi' | 'bilinmiyor'

export interface ToslaSorgu {
  durum:         ToslaDurum
  istekDurumu:   number | null
  tutarKurus:    number | null
  paraBirimi:    number | null
  iadeKurus:     number | null
  bankaKodu:     string | null
  bankaMesaji:   string | null
  yetkiKodu:     string | null
  islemNo:       string | null
  kartMaskeli:   string | null
  olusturma:     string | null
}

// Belgedeki RequestStatus tablosu (12 Kas 2026).
export function sorguyuYorumla(v: Kayit): ToslaSorgu {
  const rs = sayi(v, 'RequestStatus')
  const banka = metin(v, 'BankResponseCode')
  let durum: ToslaDurum
  if (rs === 1) durum = banka === '00' ? 'odendi' : 'basarisiz'
  else if (rs === 10 || rs === 11 || rs === 12) durum = 'bekliyor'
  else if (rs === 0) durum = 'basarisiz'
  else if (rs === 2 || rs === 15) durum = 'iptal'
  else if (rs === 3 || rs === 4 || rs === 14 || rs === 16) durum = 'iade'
  else if (rs === 6 || rs === 7) durum = 'itiraz'
  else durum = 'bilinmiyor'
  const islem = metin(v, 'TransactionId')
  return {
    durum,
    istekDurumu: rs,
    tutarKurus:  sayi(v, 'Amount'),
    paraBirimi:  sayi(v, 'Currency'),
    iadeKurus:   sayi(v, 'RefundedAmount'),
    bankaKodu:   banka,
    bankaMesaji: metin(v, 'BankResponseMessage'),
    yetkiKodu:   metin(v, 'AuthCode'),
    // Sorgu ödenmiş işlemde de TransactionId 0 dönüyor (ölçüldü); gerçek
    // işlem numarası oturum açılırken alınıp satırda saklanıyor.
    islemNo:     islem && islem !== '0' ? islem : null,
    kartMaskeli: metin(v, 'CardNo'),
    olusturma:   metin(v, 'CreateDate'),
  }
}

export async function odemeyiSorgula(k: ToslaKimlik, siparisNo: string, fetchImpl?: FetchImpl): Promise<ToslaSorgu> {
  const v = await toslaIstegi(k, 'inquiry', { orderId: siparisNo }, fetchImpl)
  kodKontrol(v, 'Ödeme sorgulanamadı')
  const q = sorguyuYorumla(v)
  // ÖLÇÜLDÜ (12 Kas, deneme ortamı): Tosla'nın TANIMADIĞI sipariş için de
  // Code 0 döner — RequestStatus 0, OrderId null. RequestStatus 0 aynı
  // zamanda "hatalı ödeme" demek; ikisi karışırsa, Tosla'da henüz görünmeyen
  // bir ödeme "başarısız" yazılıp bir daha sorulmazdı.
  const donen = metin(v, 'OrderId')
  if (donen === null) return { ...q, durum: 'bulunamadi' }
  if (donen !== siparisNo) return { ...q, durum: 'bilinmiyor' }
  return q
}

// ─── 3. Dönüş imzası ─────────────────────────────────────────────────────
// Belge: "CallbackURL'e dönen HashParameters içinde yer alan parametrelerin
// başına apiPass eklenerek" SHA512 → Base64. HashParameters gelmezse belgedeki
// örnek sıra kullanılır. ClientId/ApiUser dönüşte yoksa kendi kimliğimizden.
export const VARSAYILAN_DONUS_SIRASI = [
  'ClientId', 'ApiUser', 'OrderId', 'MdStatus', 'BankResponseCode', 'BankResponseMessage', 'RequestStatus',
] as const

export function donusImzasiDogru(k: ToslaKimlik, alanlar: Record<string, string>): boolean {
  const verilen = metin(alanlar, 'Hash')
  if (!verilen) return false
  const hp = metin(alanlar, 'HashParameters')
  const sira = hp
    ? hp.split(',').map(s => s.trim()).filter(Boolean)
    : [...VARSAYILAN_DONUS_SIRASI]
  const deger = (ad: string): string => {
    const x = metin(alanlar, ad)
    if (x !== null) return x
    const kucuk = ad.toLowerCase()
    if (kucuk === 'clientid') return k.clientId
    if (kucuk === 'apiuser')  return k.apiUser
    return ''
  }
  const beklenen = Buffer.from(sha512Base64(k.apiPass + sira.map(deger).join('')))
  const gelen = Buffer.from(verilen)
  return beklenen.length === gelen.length && timingSafeEqual(beklenen, gelen)
}

// ─── 4. İptal / iade ─────────────────────────────────────────────────────
export interface ToslaIadeSonucu { yol: 'iptal' | 'iade'; bankaKodu: string | null; islemNo: string | null }

/**
 * Gün sonundan önce `void`, sonra `refund`. Tam tutar ve aynı gün değilse doğrudan iade.
 *
 * İptal ancak Tosla onu AÇIKÇA reddederse (gün sonu alınmış, banka reddi)
 * iadeye geçilir. Ağ kopması / zaman aşımı / genel hata GEÇİCİDİR: iptal
 * Tosla'da gerçekleşmiş olabilir, ardından körlemesine iade istemek ikinci
 * bir kayıt ve yanlış "geri verilemedi" uyarısı üretirdi — hata yukarı çıkar,
 * yeniden denenir.
 */
export async function odemeyiGeriVer(
  k: ToslaKimlik,
  a: { siparisNo: string; tutarKurus: number; ayniGun: boolean; tamTutar: boolean },
  fetchImpl?: FetchImpl,
): Promise<ToslaIadeSonucu> {
  if (a.ayniGun && a.tamTutar) {
    try {
      const v = await toslaIstegi(k, 'void', { orderId: a.siparisNo }, fetchImpl)
      kodKontrol(v, 'İptal edilemedi')
      if (metin(v, 'BankResponseCode') !== '00') throw new ToslaHatasi(`İptal bankada reddedildi: ${metin(v, 'BankResponseMessage') ?? ''}`)
      return { yol: 'iptal', bankaKodu: metin(v, 'BankResponseCode'), islemNo: metin(v, 'TransactionId') }
    } catch (e) {
      if (!(e instanceof ToslaHatasi) || e.gecici) throw e
      // Açık ret: gün sonu alınmış → aynı tutar iade olarak istenir.
    }
  }
  const v = await toslaIstegi(k, 'refund', { orderId: a.siparisNo, amount: a.tutarKurus }, fetchImpl)
  kodKontrol(v, 'İade edilemedi')
  if (metin(v, 'BankResponseCode') !== '00') {
    throw new ToslaHatasi(`İade bankada reddedildi: ${metin(v, 'BankResponseMessage') ?? ''}`)
  }
  return { yol: 'iade', bankaKodu: metin(v, 'BankResponseCode'), islemNo: metin(v, 'TransactionId') }
}

// Ödeme kimliği öneki ve yardımcıları tarayıcıda da gerekiyor (panel,
// ödeme ekranı): tek kaynak lib/tosla/ortak.ts, burada yalnız yeniden açılır.
export { TOSLA_ODEME_ONEKI, toslaOdemesiMi, toslaSiparisNo } from './ortak'
