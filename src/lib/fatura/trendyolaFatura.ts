/**
 * Trendyol'a kesilecek fatura — taslak hazırlama (26 Kas 2026).
 *
 * Trendyol satıcıdan kendi adına fatura istediğinde (Finans → Fatura
 * Listeleme → "Trendyol'a Kesmem Gereken Faturalar"; ör. "Kupon Kullanımı
 * veya Promosyon Nedeniyle Kurumsal Fatura Farkı Talebi", kargo tazmini)
 * ekranda bir Fatura Kodu, KDV oranı ve KDV dahil tutar verir. Ekrandaki
 * kural: fatura satıcının kendi sisteminden kesilir, notunda Fatura Kodu
 * yazar; belge yüklenmez, Trendyol e-fatura sisteminden kendisi okur.
 *
 * Otomatik fatura işi (is.ts) yalnız müşteri siparişlerine taslak açar; bu
 * modül o işe dokunmaz. Notta "SİPARİŞ NO" geçmediği için bu belgeler
 * sipariş eşlemesine (harita.ts) hiç girmez.
 *
 * ALICI ELLE YAZILMAZ: Trendyol'un unvanı, vergi numarası, vergi dairesi ve
 * adresi daha önce Trendyol'a kesilip imzalanmış bir belgeden (BB'nin
 * Haziran 2026'da kestiği GIB2026000000429) sunucuda kopyalanır. Kaynak
 * belge imzalı değilse, alıcısı Trendyol değilse ya da bir alan eksikse
 * taslak açılmaz.
 *
 * Saf fonksiyonlar; ağ, veritabanı, ortam değişkeni yok.
 */
import { yalnizSatiri } from './yaziyla'
import { adAnahtari } from './eslesme'

/** Trendyol'un ekranındaki biçim: KRM_1181208_251126, TZM_1181208_160626 (önek_satıcı no_ggaayy). */
export const FATURA_KODU = /^[A-Z]{2,6}_\d{4,10}_\d{6}$/

/** Bu yoldan kesilebilen KDV oranları. %0 (istisna) bu yoldan kesilmez: istisna kodu ve metni elle seçilir. */
export const KDV_ORANLARI = [1, 10, 20] as const

const r2 = (x: number) => Math.round(Math.round(x * 1e6) / 1e4) / 100
const tl = (x: number) => x.toFixed(2)
const yazi = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

export type Sonuc<T> = ({ tamam: true } & T) | { tamam: false; neden: string }

/** Fatura kodundaki tarih (ggaayy) → UTC gece yarısı; okunamazsa null. */
export function koddakiTarih(kod: string): Date | null {
  const m = kod.match(/_(\d{2})(\d{2})(\d{2})$/)
  if (!m) return null
  const [gun, ay, yil] = [Number(m[1]), Number(m[2]), 2000 + Number(m[3])]
  const t = new Date(Date.UTC(yil, ay - 1, gun))
  return t.getUTCDate() === gun && t.getUTCMonth() === ay - 1 ? t : null
}

/**
 * KDV dahil tutarı matrah + KDV'ye böler; ikisinin toplamı KURUŞU KURUŞUNA
 * verilen tutara eşit olmalı. Önce matrah = tutar / (1 + oran) yuvarlanır,
 * KDV = matrah × oran yuvarlanır; tutmazsa matrah bir kuruş aşağı/yukarı
 * denenir. Hiçbiri tutmazsa null (taslak açılmaz).
 * Örnek: 22,97 TL, %20 → 19,14 + 3,83 (Trendyol'un ekranındakiyle aynı).
 */
export function tutarBol(toplam: number, oran: number): { matrah: number; kdv: number; toplam: number } | null {
  if (!Number.isFinite(toplam) || toplam <= 0 || !Number.isFinite(oran) || oran < 0) return null
  const hedef = r2(toplam)
  if (Math.abs(hedef - toplam) > 1e-9) return null // kuruştan küçük parça kabul edilmez
  const ilk = r2(hedef / (1 + oran / 100))
  for (const matrah of [ilk, r2(ilk - 0.01), r2(ilk + 0.01)]) {
    const kdv = r2((matrah * oran) / 100)
    // Oran varken KDV sıfıra yuvarlanıyorsa (ör. 0,01 TL) fatura anlamsızdır.
    if (matrah > 0 && (oran === 0 || kdv > 0) && r2(matrah + kdv) === hedef) return { matrah, kdv, toplam: hedef }
  }
  return null
}

/** Not: ilk satır Fatura Kodu (Trendyol eşlemesi bununla), ikinci satır yazıyla tutar. */
export function notMetni(kod: string, toplam: number): string {
  return `Fatura Kodu: ${kod}\n${yalnizSatiri(toplam)}`
}

/** Bir belgenin notunda bu Fatura Kodu geçiyor mu (büyük/küçük harf ve boşluk farkı yok sayılır). */
export function notundaKodVar(not: unknown, kod: string): boolean {
  return String(not ?? '').toUpperCase().replace(/\s+/g, '').includes(kod.toUpperCase())
}

/** Kaynak belgeden kopyalanan alıcı alanları (portalın form alan adlarıyla). */
export const ALICI_ALANLARI = [
  'vknTckn',
  'aliciUnvan',
  'aliciAdi',
  'aliciSoyadi',
  'vergiDairesi',
  'ulke',
  'bulvarcaddesokak',
  'binaAdi',
  'binaNo',
  'kapiNo',
  'kasabaKoy',
  'mahalleSemtIlce',
  'sehir',
  'postaKodu',
  'tel',
  'fax',
  'eposta',
  'websitesi',
] as const

export type Alici = Record<(typeof ALICI_ALANLARI)[number], string>

/**
 * Kaynak belgeden alıcıyı alır. Şartlar: belge imzalı ("Onaylandı"), alıcı
 * 10 haneli vergi numaralı bir şirket, unvanında TRENDYOL geçiyor, vergi
 * dairesi ve adres dolu. Biri tutmazsa taslak açılmaz.
 */
export function aliciKopyala(detay: Record<string, unknown>, onay: string): Sonuc<{ alici: Alici }> {
  if (onay !== 'Onaylandı') return { tamam: false, neden: 'kaynak belge imzalı değil' }
  const alici = Object.fromEntries(ALICI_ALANLARI.map((a) => [a, yazi(detay[a])])) as Alici
  alici.vknTckn = alici.vknTckn.replace(/\D/g, '')
  if (alici.vknTckn.length !== 10) return { tamam: false, neden: 'kaynak belgenin alıcısı vergi numaralı bir şirket değil' }
  if (!adAnahtari(alici.aliciUnvan).includes('TRENDYOL')) return { tamam: false, neden: 'kaynak belgenin alıcısı Trendyol değil' }
  if (alici.aliciAdi || alici.aliciSoyadi) return { tamam: false, neden: 'kaynak belgede şirket unvanının yanında kişi adı var' }
  if (!alici.vergiDairesi) return { tamam: false, neden: 'kaynak belgede vergi dairesi yok' }
  if (!alici.bulvarcaddesokak) return { tamam: false, neden: 'kaynak belgede adres yok' }
  if (!alici.ulke) return { tamam: false, neden: 'kaynak belgede ülke yok' }
  if (!alici.sehir) alici.sehir = ' '
  return { tamam: true, alici }
}

export interface TrendyolaFaturaGirdisi {
  kod: string
  /** KDV dahil tutar (Trendyol ekranındaki). */
  toplam: number
  oran: number
  /** Fatura kaleminin adı. */
  kalem: string
}

/** Girdi denetimi — ağdan önce. */
export function girdiDenetimi(g: TrendyolaFaturaGirdisi): Sonuc<{ bolum: { matrah: number; kdv: number; toplam: number } }> {
  if (!FATURA_KODU.test(g.kod)) return { tamam: false, neden: 'Fatura Kodu Trendyol biçiminde değil (ör. KRM_1181208_251126)' }
  if (!koddakiTarih(g.kod)) return { tamam: false, neden: 'Fatura Kodundaki tarih okunamadı' }
  if (!(KDV_ORANLARI as readonly number[]).includes(g.oran)) {
    return { tamam: false, neden: `KDV oranı ${KDV_ORANLARI.join(', ')} olmalı (istisnalı fatura bu yoldan kesilmez)` }
  }
  const kalem = yazi(g.kalem)
  if (kalem.length < 3 || kalem.length > 200) return { tamam: false, neden: 'kalem adı boş ya da çok uzun' }
  const bolum = tutarBol(g.toplam, g.oran)
  if (!bolum) return { tamam: false, neden: 'tutar matrah + KDV olarak kuruşu kuruşuna bölünemedi' }
  return { tamam: true, bolum }
}

/**
 * Portalın EARSIV_PORTAL_FATURA_OLUSTUR komutuna giden `jp` (alan adları ve
 * sırası taslak.ts ile aynı: portalın kendi formundan). Tip SATIS, tek kalem,
 * miktar 1, birim "C62" (adet).
 */
export function trendyolaTaslak(
  g: TrendyolaFaturaGirdisi,
  alici: Alici,
  an: { tarih: string; saat: string }
): Sonuc<{ jp: Record<string, unknown>; matrah: number; kdv: number; toplam: number; not: string }> {
  const d = girdiDenetimi(g)
  if (!d.tamam) return d
  const { matrah, kdv, toplam } = d.bolum
  const not = notMetni(g.kod, toplam)
  const jp: Record<string, unknown> = {
    faturaUuid: '',
    belgeNumarasi: '',
    faturaTarihi: an.tarih,
    saat: an.saat,
    paraBirimi: 'TRY',
    dovzTLkur: '0',
    faturaTipi: 'SATIS',
    hangiTip: '5000/30000',
    vknTckn: alici.vknTckn,
    aliciUnvan: alici.aliciUnvan,
    aliciAdi: '',
    aliciSoyadi: '',
    binaAdi: alici.binaAdi,
    binaNo: alici.binaNo,
    kapiNo: alici.kapiNo,
    kasabaKoy: alici.kasabaKoy,
    vergiDairesi: alici.vergiDairesi,
    ulke: alici.ulke,
    bulvarcaddesokak: alici.bulvarcaddesokak,
    irsaliyeNumarasi: '',
    irsaliyeTarihi: '',
    mahalleSemtIlce: alici.mahalleSemtIlce,
    sehir: alici.sehir,
    postaKodu: alici.postaKodu,
    tel: alici.tel,
    fax: alici.fax,
    eposta: alici.eposta,
    websitesi: alici.websitesi,
    iadeTable: [],
    ihracKayitliKarsiBelgeNo: '',
    yatirimTesvikNumarasi: '',
    yatirimTesvikTarihi: an.tarih,
    kdvOranKontrolMuafiyeti: false,
    vergiCesidi: ' ',
    malHizmetTable: [
      {
        malHizmet: yazi(g.kalem),
        miktar: 1,
        birim: 'C62',
        birimFiyat: tl(matrah),
        fiyat: tl(matrah),
        iskontoArttm: 'İskonto',
        iskontoOrani: 0,
        iskontoTutari: '0',
        iskontoNedeni: '',
        malHizmetTutari: tl(matrah),
        kdvOrani: String(g.oran),
        vergiOrani: 0,
        kdvTutari: tl(kdv),
        vergininKdvTutari: '0',
        ozelMatrahTutari: '0',
        hesaplananotvtevkifatakatkisi: '0',
      },
    ],
    tip: 'İskonto',
    matrah: tl(matrah),
    malhizmetToplamTutari: tl(matrah),
    toplamIskonto: '0',
    hesaplanankdv: tl(kdv),
    vergilerToplami: tl(kdv),
    vergilerDahilToplamTutar: tl(toplam),
    odenecekTutar: tl(toplam),
    not,
    siparisNumarasi: '',
    siparisTarihi: '',
    fisNo: '',
    fisTarihi: '',
    fisSaati: ' ',
    fisTipi: ' ',
    zRaporNo: '',
    okcSeriNo: '',
  }
  return { tamam: true, jp, matrah, kdv, toplam, not }
}

/** Panelde gösterilecek alıcı özeti: vergi numarasının yalnız son iki hanesi. */
export function aliciOzeti(a: Alici): Record<string, string> {
  return {
    unvan: a.aliciUnvan,
    vergiNo: a.vknTckn ? `********${a.vknTckn.slice(-2)}` : '',
    vergiDairesi: a.vergiDairesi,
    ilce: a.mahalleSemtIlce,
    il: a.sehir.trim(),
    ulke: a.ulke,
    adresVar: a.bulvarcaddesokak ? 'evet' : 'hayır',
  }
}
