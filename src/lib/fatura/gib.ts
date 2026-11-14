/**
 * GİB e-Arşiv Portal istemcisi — taslak açma ve belge okuma.
 *
 * Portalın kendi sayfalarının kullandığı uçlar (13 Kas 2026'da portal
 * sayfasından doğrulandı):
 *   giriş  POST /earsiv-services/assos-login  assoscmd=anologin (intragiris.html'deki assosLogin())
 *   komut  POST /earsiv-services/dispatch      cmd, callid, pageName, token, jp
 *   çıkış  POST /earsiv-services/assos-login  assoscmd=logout
 * Giriş bilgisi İnteraktif Vergi Dairesi kullanıcı kodu + şifresidir; ortam
 * değişkeninden okunur (GIB_KULLANICI, GIB_SIFRE), BB Vercel'e kendisi girer.
 * Şifre ve token hiçbir yere yazılmaz, loglanmaz.
 *
 * İMZA BURADA YOK: taslaklar "Onaylanmadı" durumunda kalır; BB portalda
 * Düzenlenen Belgeler → GİB İmza ile SMS koduyla imzalar. İmzalı belgenin
 * görüntüsü (portalın "Görüntüle" düğmesinin HTML'i) Trendyol'a yükleme için
 * okunur (14 Kas 2026; komut ve yanıt biçimi GİB test portalında denendi).
 */
import { randomUUID } from 'crypto'

const KOK = 'https://earsivportal.efatura.gov.tr'
const ZAMAN_ASIMI_MS = 20_000
const TARAYICI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export class GibHatasi extends Error {}

export interface GibOturum {
  token: string
}

export interface GibBelge {
  ettn: string
  belgeNumarasi: string
  belgeTarihi: string
  onayDurumu: string
  aliciVknTckn: string
  aliciUnvanAdSoyad: string
}

/** Portalın JSON zarfı: başarıda `data` ya da `token`, hatada `error` + `messages`. */
interface GibYanit {
  data?: unknown
  token?: string
  error?: unknown
  messages?: unknown[]
}

function mesajMetni(veri: GibYanit): string {
  const ilk = veri.messages?.[0] as { text?: string } | string | undefined
  const metin = typeof ilk === 'string' ? ilk : ilk?.text
  return String(metin || 'bilinmeyen hata').slice(0, 200)
}

async function gonder(yol: string, alanlar: Record<string, string>): Promise<GibYanit> {
  let yanit: Response
  try {
    yanit = await fetch(KOK + yol, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json, text/plain, */*',
        'User-Agent': TARAYICI,
        Origin: KOK,
        Referer: `${KOK}/intragiris.html`,
      },
      body: new URLSearchParams(alanlar).toString(),
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: 'no-store',
    })
  } catch (e) {
    throw new GibHatasi(`GİB'e bağlanılamadı (${(e as Error).name})`)
  }
  const metin = await yanit.text()
  let veri: GibYanit
  try {
    veri = JSON.parse(metin) ?? {}
  } catch {
    throw new GibHatasi(`GİB yanıtı okunamadı (HTTP ${yanit.status})`)
  }
  if (veri.error) throw new GibHatasi(`GİB: ${mesajMetni(veri)}`)
  return veri
}

export async function gibGiris(kullanici: string, sifre: string): Promise<GibOturum> {
  const veri = await gonder('/earsiv-services/assos-login', {
    assoscmd: 'anologin',
    rtype: 'json',
    userid: kullanici,
    sifre,
    sifre2: sifre,
    parola: '1',
  })
  if (!veri.token) throw new GibHatasi('GİB girişi oturum açmadı')
  return { token: String(veri.token) }
}

/** Çıkış hatası işi bozmaz; oturum zaten kısa ömürlü. */
export async function gibCikis(oturum: GibOturum): Promise<void> {
  try {
    await gonder('/earsiv-services/assos-login', { assoscmd: 'logout', rtype: 'json', token: oturum.token })
  } catch {
    /* yut */
  }
}

async function komut(oturum: GibOturum, cmd: string, pageName: string, jp: unknown): Promise<unknown> {
  const veri = await gonder('/earsiv-services/dispatch', {
    cmd,
    callid: `Cx${randomUUID()}`,
    pageName,
    token: oturum.token,
    jp: JSON.stringify(jp),
  })
  return veri.data
}

const ikiHane = (n: number) => String(n).padStart(2, '0')
const gunAyYil = (d: Date) => `${ikiHane(d.getUTCDate())}/${ikiHane(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`

/** İstanbul saatine göre bugünün tarihi (gg/aa/yyyy) ve saati (ss:dd:sn). */
export function istanbulSimdi(simdi = new Date()): { tarih: string; saat: string; gun: Date } {
  const parca = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(simdi)
      .map((p) => [p.type, p.value])
  )
  return {
    tarih: `${parca.day}/${parca.month}/${parca.year}`,
    saat: `${parca.hour}:${parca.minute}:${parca.second}`,
    gun: new Date(Date.UTC(Number(parca.year), Number(parca.month) - 1, Number(parca.day))),
  }
}

/**
 * Son `gun` günün belgeleri (taslak ve imzalı). Portal tek sorguda en fazla
 * 7 günlük aralık kabul ediyor ("Seçilen tarih aralığı 7 günden fazla
 * olamaz"); aralık 7'şer günlük parçalara bölünür.
 */
export async function belgeleriListele(oturum: GibOturum, gun: number): Promise<GibBelge[]> {
  const bugun = istanbulSimdi().gun
  const belgeler: GibBelge[] = []
  for (let bitisFarki = 0; bitisFarki < gun; bitisFarki += 7) {
    const bitis = new Date(bugun.getTime() - bitisFarki * 86_400_000)
    const baslangic = new Date(bitis.getTime() - Math.min(6, gun - 1 - bitisFarki) * 86_400_000)
    const veri = await komut(oturum, 'EARSIV_PORTAL_TASLAKLARI_GETIR', 'RG_BASITTASLAKLAR', {
      baslangic: gunAyYil(baslangic),
      bitis: gunAyYil(bitis),
      hangiTip: '5000/30000',
      table: [],
    })
    const satirlar = (Array.isArray(veri) ? veri : []) as Record<string, unknown>[]
    for (const b of satirlar) {
      if (b?.error) throw new GibHatasi(`GİB: ${String(b.error).slice(0, 200)}`)
      if (b?.ettn) {
        belgeler.push({
          ettn: String(b.ettn),
          belgeNumarasi: String(b.belgeNumarasi ?? ''),
          belgeTarihi: String(b.belgeTarihi ?? ''),
          onayDurumu: String(b.onayDurumu ?? ''),
          aliciVknTckn: String(b.aliciVknTckn ?? ''),
          aliciUnvanAdSoyad: String(b.aliciUnvanAdSoyad ?? ''),
        })
      }
    }
  }
  return belgeler
}

export async function belgeGetir(oturum: GibOturum, ettn: string): Promise<Record<string, unknown>> {
  const veri = await komut(oturum, 'EARSIV_PORTAL_FATURA_GETIR', 'RG_BASITFATURA', { ettn })
  if (!veri || typeof veri !== 'object') throw new GibHatasi('GİB belgeyi döndürmedi')
  return veri as Record<string, unknown>
}

/** Taslak oluşturur. Portal başarıyı yalnız metinle bildiriyor; başka her yanıt hata sayılır. */
export async function faturaOlustur(oturum: GibOturum, jp: Record<string, unknown>): Promise<void> {
  const veri = await komut(oturum, 'EARSIV_PORTAL_FATURA_OLUSTUR', 'RG_BASITFATURA', jp)
  const metin = typeof veri === 'string' ? veri : JSON.stringify(veri ?? '')
  if (!/başarıyla oluşturul/i.test(metin)) throw new GibHatasi(`GİB: ${metin.slice(0, 200)}`)
}

/**
 * Belgenin portalda "Görüntüle" ile açılan HTML'i (GİB'in kendi fatura
 * görüntüsü: karekod betiği ve logolar içinde, dış kaynak yok, ~55 KB).
 * `onayDurumu` listedeki değerle aynen gider ("Onaylandı" / "Onaylanmadı").
 */
export async function faturaGoruntusu(oturum: GibOturum, ettn: string, onayDurumu: string): Promise<string> {
  const veri = await komut(oturum, 'EARSIV_PORTAL_FATURA_GOSTER', 'RG_TASLAKLAR', { ettn, onayDurumu })
  if (typeof veri !== 'string' || !/<html/i.test(veri)) throw new GibHatasi('GİB fatura görüntüsünü döndürmedi')
  return veri
}
