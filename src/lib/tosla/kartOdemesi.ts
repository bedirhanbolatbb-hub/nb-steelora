// ─── KARTLA ÖDEME — tamamla · süpür · geri ver (Tosla İşim, 12 Kasım 2026) ───
//
// Sipariş satırı (orders) yaşamı — yeni durum EKLENMEZ, `orders.status`
// listesi aynı kalır; kartın ara durumu `metadata.kart.durum`'da tutulur:
//
//   pending + kart.bekliyor ──(sorgu: ödendi, tutar BİREBİR)──▶ paid
//      │                     ──(sorgu: reddedildi/iptal)───────▶ pending + kart.basarisiz
//      │                     ──(tutar uyuşmuyor, beklenmeyen)──▶ pending + kart.inceleme (BB'ye mail)
//      └── 24 saat Tosla tanımıyor / hâlâ bekliyor ──(süpürge)──▶ pending + kart.basarisiz
//
// "pending + kart.basarisiz" panelde "yarım kalan" ödemedir — eski iyzico
// akışında da başarısız kart denemesi siparişi pending bırakıyordu.
//
// KARAR SORGUDAN: dönüş adresine gelen POST yalnız "bitti" sinyalidir.
// Tosla'ya sunucudan sunucuya sorulur; ancak "ödendi" ve tutar kuruşu
// kuruşuna sipariş tutarıysa sipariş ödenir. Dönüş ve süpürge aynı anda
// gelirse `status = 'pending'` koşullu güncelleme yalnız birini geçirir:
// stok iki kez düşmez, mail iki kez gitmez.
//
// PARA ÇEKİLDİ AMA SİPARİŞ AÇILAMADIYSA sessiz kalınmaz: kart.inceleme +
// her olay için BB'ye ayrı e-posta (pencereye takılmaz).

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendMail } from '@/lib/emails/send'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { kritikUyariEmail } from '@/lib/emails/templates'
import { odemeBildirimleriniGonder, odemeSonrasiIsle } from '@/lib/odeme/odemeSonrasi'
import {
  type ToslaKimlik, type ToslaOrtam, type ToslaSorgu, type ToslaIadeSonucu,
  ToslaHatasi, TOSLA_TL, TOSLA_ODEME_ONEKI,
  kurusa, odemeyiGeriVer, odemeyiSorgula, toslaZamani,
} from './client'

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

// Sipariş numarası deseni tarayıcıda da gerekiyor: tek kaynak lib/tosla/ortak.ts.
export { KART_SIPARIS_DESENI } from './ortak'

export type KartDurumu = 'bekliyor' | 'odendi' | 'basarisiz' | 'inceleme'

/** orders.metadata.kart — kart denemesinin izi (kart numarası ASLA yazılmaz). */
export interface KartIzi {
  saglayici:     'tosla'
  ortam:         ToslaOrtam
  durum:         KartDurumu
  oturum_at:     string
  islem_no?:     string | null
  banka_kodu?:   string | null
  banka_mesaji?: string | null
  yetki_kodu?:   string | null
  /** Tosla'nın maskeli kart gösterimi (ilk 6 + son 4) — destek için. */
  kart?:         string | null
  odendi_at?:    string | null
  sonuc_at?:     string | null
  neden?:        string | null
}

function kisalt(x: unknown, n = 300): string {
  const s = x instanceof Error ? x.message : String(x)
  return s.length > n ? `${s.slice(0, n)}…` : s
}

// ─── Saf karar ──────────────────────────────────────────────────────────
export type Karar =
  | { tur: 'bekle' }
  | { tur: 'basarisiz'; neden: string | null }
  | { tur: 'inceleme'; neden: string }
  | { tur: 'ode' }

/**
 * Sorgu + sipariş tutarı → ne yapılacak. Yan etkisiz, testlenebilir.
 *
 * 'bulunamadi': Tosla siparişi (henüz) tanımıyor — ödeme yok demek değil,
 * var demek de değil. Beklenir; süpürge 24 saat sonra kapatır.
 */
export function kararVer(siparisTutariTl: number, q: ToslaSorgu): Karar {
  if (q.durum === 'bekliyor' || q.durum === 'bulunamadi') return { tur: 'bekle' }
  if (q.durum === 'basarisiz' || q.durum === 'iptal') return { tur: 'basarisiz', neden: q.bankaMesaji }
  if (q.durum !== 'odendi') {
    return { tur: 'inceleme', neden: `beklenmeyen sorgu durumu: ${q.durum} (RequestStatus ${q.istekDurumu ?? '?'})` }
  }
  const beklenen = kurusa(siparisTutariTl)
  if (q.tutarKurus !== beklenen || (q.paraBirimi !== null && q.paraBirimi !== TOSLA_TL)) {
    return {
      tur: 'inceleme',
      neden: `tutar uyuşmuyor: sorgu ${q.tutarKurus ?? '?'} kuruş (${q.paraBirimi ?? '?'}), beklenen ${beklenen} kuruş`,
    }
  }
  return { tur: 'ode' }
}

// ─── Tamamla ────────────────────────────────────────────────────────────
export type TamamlaSonucu =
  | { sonuc: 'odendi'; siparis: any }
  | { sonuc: 'zaten' }
  | { sonuc: 'bekliyor' }
  | { sonuc: 'basarisiz'; neden: string | null }
  | { sonuc: 'inceleme'; neden: string }
  | { sonuc: 'kapali' }
  | { sonuc: 'bulunamadi' }
  | { sonuc: 'hata'; neden: string; gecici: boolean }

async function izGuncelle(db: SupabaseClient, siparis: any, ek: Partial<KartIzi>): Promise<boolean> {
  const meta = (siparis.metadata ?? {}) as Record<string, any>
  const { data, error } = await db
    .from('orders')
    .update({ metadata: { ...meta, kart: { ...(meta.kart ?? {}), ...ek } }, updated_at: new Date().toISOString() })
    .eq('id', siparis.id)
    .eq('status', 'pending')
    .select('id')
  if (error) console.error(`[kart] iz yazılamadı | ${siparis.order_number} | ${error.message}`)
  return Boolean(data?.length)
}

/** Para çekilmiş olabilecek her pürüz için BB'ye AYRI e-posta (pencere yok). */
export async function incelemeBildir(baslik: string, siparisNo: string, neden: string, q?: ToslaSorgu | null): Promise<void> {
  console.error(`[kart] İNCELEME | ${siparisNo} | ${neden}`)
  try {
    const mail = kritikUyariEmail({
      baslik,
      mesaj: `${neden}. Müşteriye bir şey söylemeden önce Tosla İşim panelinde bu siparişe bakın.`,
      tip: 'kart_odeme',
      bastirilan: 0,
      ilkGorulme: null,
      detay: {
        siparis: siparisNo,
        tosla_durum: q?.durum ?? '—',
        tutar_kurus: q?.tutarKurus ?? '—',
        banka_kodu: q?.bankaKodu ?? '—',
      },
    })
    await sendMail({ to: await bildirimAdresi(), subject: mail.subject, html: mail.html, label: 'Kart ödemesi inceleme' })
  } catch (e) {
    console.error('[kart] inceleme maili gönderilemedi:', kisalt(e))
  }
}

/**
 * Siparişi Tosla'ya sorar ve sonucu uygular. Dönüş ucu ve gecelik süpürge
 * AYNI fonksiyonu çağırır. Bildirimleri GÖNDERMEZ — çağıran gönderir
 * (dönüş ucu yanıttan sonra, süpürge sırayla).
 */
export async function kartOdemesiniTamamla(
  db: SupabaseClient,
  siparisNo: string,
  a: { kimlik: ToslaKimlik; fetchImpl?: FetchImpl; etiket?: string },
): Promise<TamamlaSonucu> {
  const etiket = a.etiket ?? '[kart]'
  const { data: siparis, error } = await db.from('orders').select('*').eq('order_number', siparisNo).maybeSingle()
  if (error) return { sonuc: 'hata', neden: error.message, gecici: true }
  if (!siparis) return { sonuc: 'bulunamadi' }
  const meta = (siparis.metadata ?? {}) as Record<string, any>
  const kart = meta.kart as KartIzi | undefined
  if (meta.odeme_yontemi !== 'kart' || !kart || kart.saglayici !== 'tosla') return { sonuc: 'bulunamadi' }

  if (siparis.status !== 'pending') {
    if (siparis.iyzico_payment_id === TOSLA_ODEME_ONEKI + siparisNo) return { sonuc: 'zaten' }
    if (['cancelled', 'refunded'].includes(String(siparis.status))) {
      // Sipariş ödeme SÜRERKEN panelden iptal edilmiş olabilir. Tosla'ya
      // sorulmadan "kapalı" denirse, kartından para çekilmiş müşteri
      // siparişsiz kalır ve kimsenin haberi olmaz. Para alınmışsa BB'ye
      // ayrı uyarı gider (iade Tosla panelinden yapılır) ve müşteriye
      // "kontrol ediliyor" denir; para alınmadıysa sipariş kapalıdır.
      if (kart.ortam !== a.kimlik.ortam) return { sonuc: 'kapali' }
      try {
        const q = await odemeyiSorgula(a.kimlik, siparisNo, a.fetchImpl)
        if (q.durum === 'odendi') {
          const neden = 'sipariş iptal edilmişken ödeme alındı — tutarı Tosla İşim panelinden müşteriye iade edin'
          await incelemeBildir('İptal edilmiş siparişe ödeme geldi', siparisNo, neden, q)
          return { sonuc: 'inceleme', neden }
        }
      } catch (e) {
        return { sonuc: 'hata', neden: kisalt(e), gecici: e instanceof ToslaHatasi ? e.gecici : true }
      }
      return { sonuc: 'kapali' }
    }
    return { sonuc: 'hata', neden: `beklenmeyen sipariş durumu: ${siparis.status}`, gecici: false }
  }
  if (kart.durum === 'inceleme') return { sonuc: 'inceleme', neden: kart.neden ?? 'yönetici incelemesinde' }
  // Sipariş hangi ortamda açıldıysa sorgu oraya gider; ayar değiştiyse karar verilmez.
  if (kart.ortam !== a.kimlik.ortam) {
    return { sonuc: 'hata', neden: `ortam uyuşmuyor (${kart.ortam} ≠ ${a.kimlik.ortam})`, gecici: false }
  }

  let q: ToslaSorgu
  try {
    q = await odemeyiSorgula(a.kimlik, siparisNo, a.fetchImpl)
  } catch (e) {
    // Geçici (ağ, zaman aşımı, Tosla genel hatası) ile kesin hata ayrılır:
    // geçici hatada ödenmiş bir siparişi "başarısız" yazmak, parası alınmış
    // müşteriyi siparişsiz bırakırdı.
    return { sonuc: 'hata', neden: kisalt(e), gecici: e instanceof ToslaHatasi ? e.gecici : true }
  }

  const k = kararVer(Number(siparis.total) || 0, q)
  const banka = { banka_kodu: q.bankaKodu, banka_mesaji: q.bankaMesaji, ...(q.islemNo ? { islem_no: q.islemNo } : {}) }

  if (k.tur === 'bekle') return { sonuc: 'bekliyor' }

  if (k.tur === 'basarisiz') {
    await izGuncelle(db, siparis, { durum: 'basarisiz', ...banka, sonuc_at: new Date().toISOString() })
    return { sonuc: 'basarisiz', neden: k.neden }
  }

  if (k.tur === 'inceleme') {
    await izGuncelle(db, siparis, { durum: 'inceleme', ...banka, neden: k.neden, sonuc_at: new Date().toISOString() })
    await incelemeBildir('Kart ödemesi incelemede', siparisNo, k.neden, q)
    return { sonuc: 'inceleme', neden: k.neden }
  }

  // ─── ÖDENDİ: tutar birebir — sipariş açılır (yalnız bir kez) ─────────────
  const simdi = new Date().toISOString()
  const { data: guncel, error: oErr } = await db
    .from('orders')
    .update({
      status: 'paid',
      iyzico_payment_id: TOSLA_ODEME_ONEKI + siparisNo,
      metadata: {
        ...meta,
        kart: {
          ...kart, ...banka, durum: 'odendi', yetki_kodu: q.yetkiKodu, kart: q.kartMaskeli,
          odendi_at: simdi, sonuc_at: simdi,
        },
      },
      updated_at: simdi,
    })
    .eq('id', siparis.id)
    .eq('status', 'pending')
    .select()

  if (oErr) {
    const neden = `para çekildi, sipariş açılamadı: ${oErr.message}`
    await incelemeBildir('Kart ödemesi alındı ama sipariş açılamadı', siparisNo, neden, q)
    return { sonuc: 'inceleme', neden }
  }
  const order = guncel?.[0]
  if (!order) return { sonuc: 'zaten' } // aynı anda gelen diğer çağrı açtı

  try {
    await odemeSonrasiIsle(db, order, Number(order.total) || 0, etiket)
  } catch (e) {
    // Sipariş ödendi; stok/kupon zinciri hata verdiyse BB görsün.
    await incelemeBildir('Kart ödemesi alındı, sipariş sonrası adımlar tamamlanamadı', siparisNo, kisalt(e), q)
  }
  return { sonuc: 'odendi', siparis: order }
}

// ─── Süpürge ────────────────────────────────────────────────────────────
export interface SupurmeOzeti { bakilan: number; odendi: number; basarisiz: number; inceleme: number; kapanan: number; hata: number }

/** Dönüşü hiç gelmeyen deneme bu kadar saat sonra "tamamlanmadı" kapanır. */
export const TERK_SAATI = 24

/**
 * Müşteri ödedikten sonra sekmeyi kapattıysa dönüş hiç gelmez; parası
 * alınmış sipariş "pending" kalmasın. Gecelik koşuda bekleyen kart
 * siparişleri yeniden sorulur.
 */
export async function bekleyenKartOdemeleriniSupur(
  db: SupabaseClient,
  a: { kimlik: ToslaKimlik; fetchImpl?: FetchImpl; simdi?: Date; limit?: number },
): Promise<SupurmeOzeti> {
  const simdi = a.simdi ?? new Date()
  const ozet: SupurmeOzeti = { bakilan: 0, odendi: 0, basarisiz: 0, inceleme: 0, kapanan: 0, hata: 0 }
  const enYeni = new Date(simdi.getTime() - 10 * 60_000).toISOString()       // müşteri hâlâ ödüyor olabilir
  const enEski = new Date(simdi.getTime() - 7 * 24 * 3_600_000).toISOString()
  const { data, error } = await db
    .from('orders')
    .select('order_number, created_at, metadata')
    .eq('status', 'pending')
    .eq('metadata->>odeme_yontemi', 'kart')
    .eq('metadata->kart->>durum', 'bekliyor')
    .lt('created_at', enYeni)
    .gt('created_at', enEski)
    .order('created_at', { ascending: true })
    .limit(a.limit ?? 50)
  if (error) {
    console.error('[kart-supurge] okunamadı:', error.message)
    ozet.hata++
    return ozet
  }
  for (const s of data ?? []) {
    ozet.bakilan++
    const r = await kartOdemesiniTamamla(db, s.order_number, { kimlik: a.kimlik, fetchImpl: a.fetchImpl, etiket: '[kart-supurge]' })
    if (r.sonuc === 'odendi') {
      ozet.odendi++
      try { await odemeBildirimleriniGonder(r.siparis, { yonetici: true }) } catch (e) {
        console.error('[kart-supurge] bildirim gönderilemedi:', kisalt(e))
      }
    } else if (r.sonuc === 'basarisiz') ozet.basarisiz++
    else if (r.sonuc === 'inceleme') ozet.inceleme++
    else if (r.sonuc === 'bekliyor' || (r.sonuc === 'hata' && !r.gecici)) {
      const yasSaat = (simdi.getTime() - new Date(s.created_at).getTime()) / 3_600_000
      if (yasSaat >= TERK_SAATI && r.sonuc === 'bekliyor') {
        const { data: tam } = await db.from('orders').select('*').eq('order_number', s.order_number).maybeSingle()
        if (tam && (await izGuncelle(db, tam, { durum: 'basarisiz', neden: 'ödeme tamamlanmadı (24 saat)', sonuc_at: simdi.toISOString() }))) {
          ozet.kapanan++
        }
      } else if (r.sonuc === 'hata') ozet.hata++
    } else if (r.sonuc === 'hata') ozet.hata++
  }
  return ozet
}

// ─── Geri ver (iptal / iade / kalem iptali) ─────────────────────────────

/** İki an Türkiye takviminde aynı gün mü (Tosla'nın gün sonu TR saatiyle). */
export function ayniTrGunu(a: Date, b: Date): boolean {
  return toslaZamani(a).slice(0, 8) === toslaZamani(b).slice(0, 8)
}

/** Kuruşu ekranda okunur TL'ye çevirir (hata mesajları için). */
function tlYaz(kurus: number): string {
  return `${(kurus / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

/** Geri vermenin sonucu; `zaten`: Tosla kaydına göre iş daha önce yapılmış. */
export type KartGeriVerSonucu = ToslaIadeSonucu & { zaten?: boolean }

/**
 * Kart ödemesini (tamamını ya da bir kısmını) geri verir. Kimlik için
 * TOSLA_ODEME_ACIK aranmaz: kart kabulü kapatılsa bile eski siparişin iadesi
 * yapılabilmeli.
 *
 * KARAR TOSLA'NIN KAYDINA GÖRE VERİLİR (12 Kas 2026). Sitede kalem iptali
 * var: siparişin bugünkü toplamı, karttan çekilen tutar DEĞİLDİR. Önce
 * Tosla'ya "bu işlemde ne kadar çekildi, ne kadarı iade edildi" diye
 * sorulur, sonra:
 *  - İptal (void) bütün işlemi geri alır; yalnız hiç iade yapılmamışsa,
 *    istenen tutar çekilenin tamamıysa ve gün sonu alınmamışsa seçilir.
 *  - Tosla'da kalan tutar siparişin toplamıyla kuruşu kuruşuna aynı olmalı.
 *    Değilse sitede görünmeyen bir iade (ya da tersi) vardır: iade DURUR ve
 *    sebebi yazılır — körlemesine istek, aynı parayı iki kez geri gönderirdi.
 *  - İşlem zaten iptal edilmiş ya da tamamı iade edilmişse ve istenen de
 *    tam iadeyse, iş yapılmış demektir (yarıda kalan bir denemenin tekrarı):
 *    Tosla'ya yeni istek gitmez, başarı döner.
 */
export async function kartOdemesiniGeriVer(
  kimlik: ToslaKimlik,
  siparis: { order_number: string; total: number | string; metadata?: any },
  a: { tutarTl?: number; simdi?: Date; fetchImpl?: FetchImpl } = {},
): Promise<KartGeriVerSonucu> {
  const toplam = Number(siparis.total) || 0
  const tutarTl = a.tutarTl ?? toplam
  const tutarKurus = kurusa(tutarTl)
  if (!Number.isInteger(tutarKurus) || tutarKurus <= 0) throw new ToslaHatasi('İade tutarı geçersiz')
  const siparisKalanKurus = kurusa(toplam)

  const q = await odemeyiSorgula(kimlik, siparis.order_number, a.fetchImpl)
  if (q.paraBirimi !== null && q.paraBirimi !== TOSLA_TL) {
    throw new ToslaHatasi(`Tosla kaydında beklenmeyen para birimi (${q.paraBirimi}); iade durduruldu`)
  }
  const tamIadeIstegi = tutarKurus === siparisKalanKurus

  if (q.durum === 'iptal') {
    if (tamIadeIstegi) return { yol: 'iptal', bankaKodu: null, islemNo: null, zaten: true }
    throw new ToslaHatasi('Bu ödeme Tosla\'da zaten iptal edilmiş; karttan çekilmiş tutar kalmadı')
  }
  if (q.durum !== 'odendi' && q.durum !== 'iade') {
    const neden =
      q.durum === 'itiraz'
        ? 'ödemeye kart sahibi itiraz etmiş (banka süreci sürüyor)'
        : `Tosla'daki durum "${q.durum}"`
    throw new ToslaHatasi(`İade yapılamaz: ${neden}`)
  }
  if (q.tutarKurus === null) {
    throw new ToslaHatasi('Ödeme tutarı Tosla\'dan okunamadı', undefined, true)
  }

  const iadeEdilmis = Math.max(0, q.iadeKurus ?? 0)
  const toslaKalan = q.tutarKurus - iadeEdilmis
  if (toslaKalan <= 0) {
    if (tamIadeIstegi) return { yol: 'iade', bankaKodu: null, islemNo: null, zaten: true }
    throw new ToslaHatasi('Bu ödemenin tamamı Tosla\'da zaten iade edilmiş')
  }
  if (toslaKalan !== siparisKalanKurus) {
    throw new ToslaHatasi(
      `Tosla kaydı ile sipariş tutarı uyuşmuyor (Tosla'da iade edilebilir ${tlYaz(toslaKalan)}, ` +
        `siparişte ${tlYaz(siparisKalanKurus)}); iade durduruldu, Tosla panelinden kontrol edin`,
    )
  }
  if (tutarKurus > toslaKalan) {
    throw new ToslaHatasi(`İade tutarı (${tlYaz(tutarKurus)}) karttaki kalan tutarı (${tlYaz(toslaKalan)}) aşıyor`)
  }

  const odendi = siparis.metadata?.kart?.odendi_at ? new Date(siparis.metadata.kart.odendi_at) : null
  return odemeyiGeriVer(kimlik, {
    siparisNo: siparis.order_number,
    tutarKurus,
    ayniGun: odendi ? ayniTrGunu(odendi, a.simdi ?? new Date()) : false,
    // İptal yalnız hiç iade yapılmamış işlemin TAMAMI için.
    tamTutar: iadeEdilmis === 0 && tutarKurus === q.tutarKurus,
  }, a.fetchImpl)
}

/**
 * Siparişten tek kalem çıkarılınca iade edilecek tutar: kalemin brüt
 * bedelinin, kalan kalemlerin brüt toplamına göre ödenen tutardaki payı.
 * Kampanya indirimi kalemlere oranla dağılmış kabul edilir; kargo (ücretsiz
 * değilse) iade edilmez. Yuvarlama kuruşa; sonuç ödenenden büyük olamaz.
 */
export function kalemIadePayi(a: {
  kalemBrut: number
  kalanKalemlerBrut: number
  odenenToplam: number
  kargo: number
}): number {
  const odenenUrun = Math.max(0, a.odenenToplam - Math.max(0, a.kargo))
  if (a.kalanKalemlerBrut <= 0 || a.kalemBrut <= 0) return 0
  const pay = Math.round((a.kalemBrut * odenenUrun / a.kalanKalemlerBrut) * 100) / 100
  return Math.min(pay, Math.round(odenenUrun * 100) / 100)
}
