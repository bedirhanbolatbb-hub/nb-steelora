/**
 * Trendyol'a kesilecek fatura — GİB adımları (26 Kas 2026). Saf kısım ve
 * kurallar: trendyolaFatura.ts. Çağıran: /api/fatura/trendyol (yalnız panel
 * oturumu). Ayrıntı: docs/fatura-otomatik.md → "Trendyol'a kesilen faturalar".
 *
 *  onizleme: kaynak belgeyi bulur, alıcıyı kopyalar, aynı Fatura Kodu daha
 *            önce kesilmiş mi bakar, hazırlanan taslağı gösterir. Yazmaz.
 *  kes     : aynı denetimlerden sonra taslağı açar (imzasız, "Onaylanmadı";
 *            BB GİB İmza ile imzalar) ve açılan belgeyi geri okur.
 * İkisi de otomatik fatura işiyle aynı kilidi kullanır: aynı anda iki GİB
 * oturumu açılmaz. Kişisel veri yok (alıcı Trendyol'un şirketi); yine de
 * vergi numarası yanıtta maskelenir, hiçbir şey loglanmaz.
 */
import { belgeGetir, belgeleriAralikta, faturaOlustur, gibCikis, gibGiris, istanbulSimdi, type GibOturum } from './gib'
import { kilitAl, kilitBirak } from './is'
import {
  aliciKopyala,
  aliciOzeti,
  girdiDenetimi,
  koddakiTarih,
  notundaKodVar,
  trendyolaTaslak,
  type TrendyolaFaturaGirdisi,
} from './trendyolaFatura'

const GUN = 86_400_000
/** Kaynak belge, verilen tarihin bu kadar gün öncesi ve sonrası içinde aranır. */
const KAYNAK_PAYI = 14

export interface KaynakBelge {
  belge: string
  /** gg/aa/yyyy — belgenin yaklaşık tarihi. */
  tarih: string
}

export interface TrendyolaFaturaSonucu {
  tamam: boolean
  neden?: string
  kip: 'onizleme' | 'kes'
  kaynak?: { belge: string; tarih: string; onay: string; tip: string; kalemler: string[]; not: string }
  alici?: Record<string, string>
  oncekiBelge?: { belge: string; onay: string } | null
  taslak?: { tarih: string; tip: string; kalem: string; matrah: string; kdv: string; toplam: string; oran: number; not: string }
  acilan?: { belge: string; ettn: string; onay: string } | null
}

const gunAyYil = (s: string): Date | null => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const t = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])))
  return t.getUTCDate() === Number(m[1]) ? t : null
}
const enGec = (a: Date, b: Date) => (a.getTime() < b.getTime() ? a : b)
const mesaj = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 240)

/** Fatura Kodunu notunda taşıyan belge (kodun tarihinden bugüne). */
async function kodluBelge(oturum: GibOturum, kod: string): Promise<{ belge: string; ettn: string; onay: string } | null> {
  const bugun = istanbulSimdi().gun
  const bas = koddakiTarih(kod) ?? new Date(bugun.getTime() - 35 * GUN)
  // Trendyol'un talebi kodun gününde açılır; bir gün geri pay.
  const belgeler = await belgeleriAralikta(oturum, enGec(new Date(bas.getTime() - GUN), bugun), bugun)
  for (const b of belgeler) {
    const d = await belgeGetir(oturum, b.ettn)
    if (notundaKodVar(d.not, kod)) return { belge: b.belgeNumarasi, ettn: b.ettn, onay: b.onayDurumu }
  }
  return null
}

export async function trendyolaFatura(
  kip: 'onizleme' | 'kes',
  g: TrendyolaFaturaGirdisi,
  kaynak: KaynakBelge
): Promise<TrendyolaFaturaSonucu> {
  const s: TrendyolaFaturaSonucu = { tamam: false, kip }
  const hata = (neden: string) => ({ ...s, tamam: false, neden })

  const girdi = girdiDenetimi(g)
  if (!girdi.tamam) return hata(girdi.neden)
  if (!/^[A-Z0-9]{3}\d{13}$/.test(kaynak.belge)) return hata('kaynak belge numarası biçimsiz')
  const kaynakGunu = gunAyYil(kaynak.tarih)
  if (!kaynakGunu) return hata('kaynak belge tarihi gg/aa/yyyy olmalı')

  const kullanici = process.env.GIB_KULLANICI?.trim()
  const sifre = process.env.GIB_SIFRE?.trim()
  if (!kullanici || !sifre) return hata('GİB giriş bilgisi tanımlı değil')

  const kilit = await kilitAl().catch(() => null)
  if (!kilit) return hata('başka bir fatura turu sürüyor; birkaç dakika sonra tekrar deneyin')
  let oturum: GibOturum | null = null
  try {
    oturum = await gibGiris(kullanici, sifre)

    // 1. Kaynak belge → alıcı
    const bugun = istanbulSimdi().gun
    const liste = await belgeleriAralikta(
      oturum,
      new Date(kaynakGunu.getTime() - KAYNAK_PAYI * GUN),
      enGec(new Date(kaynakGunu.getTime() + KAYNAK_PAYI * GUN), bugun)
    )
    const bulunan = liste.filter((b) => b.belgeNumarasi === kaynak.belge)
    if (bulunan.length !== 1) return hata(`kaynak belge ${bulunan.length ? 'birden çok' : 'bulunamadı'} (tarihi doğru mu?)`)
    const detay = await belgeGetir(oturum, bulunan[0].ettn)
    if (String(detay.belgeNumarasi ?? '') !== kaynak.belge) return hata('kaynak belgenin ayrıntısı listeyle uyuşmuyor')
    const kalemler = Array.isArray(detay.malHizmetTable) ? (detay.malHizmetTable as Record<string, unknown>[]) : []
    s.kaynak = {
      belge: kaynak.belge,
      tarih: String(detay.faturaTarihi ?? bulunan[0].belgeTarihi),
      onay: bulunan[0].onayDurumu,
      tip: String(detay.faturaTipi ?? ''),
      kalemler: kalemler.map((k) => String(k?.malHizmet ?? '')),
      not: String(detay.not ?? ''),
    }
    const alici = aliciKopyala(detay, bulunan[0].onayDurumu)
    if (!alici.tamam) return hata(alici.neden)
    s.alici = aliciOzeti(alici.alici)

    // 2. Aynı Fatura Kodu daha önce kesildi mi?
    s.oncekiBelge = await kodluBelge(oturum, g.kod)
    if (s.oncekiBelge) {
      const o = s.oncekiBelge
      return hata(`bu Fatura Kodu ${o.belge || 'numarasız taslak'} belgesinde zaten var (${o.onay}); ikinci kez kesilmez`)
    }

    // 3. Taslak
    const an = istanbulSimdi()
    const t = trendyolaTaslak(g, alici.alici, an)
    if (!t.tamam) return hata(t.neden)
    s.taslak = {
      tarih: `${an.tarih} ${an.saat}`,
      tip: String(t.jp.faturaTipi),
      kalem: String((t.jp.malHizmetTable as Record<string, unknown>[])[0].malHizmet),
      matrah: t.matrah.toFixed(2),
      kdv: t.kdv.toFixed(2),
      toplam: t.toplam.toFixed(2),
      oran: g.oran,
      not: t.not,
    }
    if (kip === 'onizleme') return { ...s, tamam: true }

    await faturaOlustur(oturum, t.jp)
    s.acilan = await kodluBelge(oturum, g.kod)
    if (!s.acilan) return hata('taslak açıldı dendi ama geri okunamadı; portalda Düzenlenen Belgeler\'e bakın, tekrar denemeyin')
    return { ...s, tamam: true }
  } catch (e) {
    return hata(mesaj(e))
  } finally {
    if (oturum) await gibCikis(oturum)
    await kilitBirak(kilit)
  }
}
