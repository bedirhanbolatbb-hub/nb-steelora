import { createServiceClient } from '@/lib/supabase/service'
import { SAYILAN_GRUPLAR, TARAYICILAR, type TarayiciGrubu } from './tarayicilar'

/**
 * Panel → Analiz: tarayıcı ziyaretleri özeti (24 Kas 2026).
 *
 * Kaynak: public.tarayici_ziyaretleri (günlük sayaç satırları; istek katmanı
 * yazar). Tablo henüz kurulmadıysa `kurulu: false` döner ve kart bunu söyler —
 * panel hata vermez.
 */
export type TarayiciSatiri = {
  ad: string
  isletmeci: string
  grup: TarayiciGrubu
  ziyaret: number
  /** Dönem içindeki en son ziyaret (ISO). */
  sonGorulme: string | null
}

export type TarayiciRaporu = {
  kurulu: boolean
  /**
   * Şu an sayılan gruplar (25 Kas 2026'dan beri yalnız asistanlar). Kart,
   * sayılmayan grubu yalnız seçili dönemde ESKİ kaydı varsa ve "sayılmıyor"
   * notuyla gösterir — "gelen olmadı" yazıp yanlış izlenim vermesin diye.
   */
  sayilanGruplar: TarayiciGrubu[]
  tarayicilar: TarayiciSatiri[]
  /** Sayılan yapay zekâ gruplarının (asistanlar) en çok okuduğu sayfalar. */
  sayfalar: { yol: string; ziyaret: number }[]
  toplam: Record<TarayiciGrubu, number>
}

const BOS: TarayiciRaporu = {
  kurulu: false,
  sayilanGruplar: [...SAYILAN_GRUPLAR],
  tarayicilar: [],
  sayfalar: [],
  toplam: { asistan: 0, egitim: 0, arama: 0 },
}

/** Tarihi İstanbul takvim gününe çevirir (YYYY-AA-GG). */
export function istanbulGunu(t: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(t)
}

type HamSatir = { gun: string; tarayici: string; grup: string; yol: string; adet: number; son_gorulme: string | null }

/**
 * Ham sayaç satırlarını kart verisine toplar — veritabanından bağımsız, test edilir.
 * `sayfaGruplari`: "en çok okunan sayfalar" hangi gruplardan toplanır. Varsayılan
 * sayılan gruplardır; böylece 24–25 Kas'ın eğitim tarayıcısı kayıtları (GPTBot,
 * PetalBot) asistanların okuduğu sayfaların önüne geçmez.
 */
export function tarayiciOzeti(
  satirlar: HamSatir[],
  sayfaAdedi = 5,
  sayfaGruplari: readonly TarayiciGrubu[] = SAYILAN_GRUPLAR
): Omit<TarayiciRaporu, 'kurulu' | 'sayilanGruplar'> {
  const isletmeciler = new Map(TARAYICILAR.map((t) => [t.ad, t.isletmeci]))
  const tarayicilar = new Map<string, TarayiciSatiri>()
  const sayfalar = new Map<string, number>()
  const toplam: Record<TarayiciGrubu, number> = { asistan: 0, egitim: 0, arama: 0 }

  for (const s of satirlar) {
    const grup = (['asistan', 'egitim', 'arama'] as const).find((g) => g === s.grup)
    const adet = Number(s.adet) || 0
    if (!grup || adet <= 0) continue
    toplam[grup] += adet

    const mevcut = tarayicilar.get(s.tarayici) ?? {
      ad: s.tarayici,
      isletmeci: isletmeciler.get(s.tarayici) ?? '',
      grup,
      ziyaret: 0,
      sonGorulme: null,
    }
    mevcut.ziyaret += adet
    if (s.son_gorulme && (!mevcut.sonGorulme || s.son_gorulme > mevcut.sonGorulme)) {
      mevcut.sonGorulme = s.son_gorulme
    }
    tarayicilar.set(s.tarayici, mevcut)

    // "En çok okunan sayfalar" yalnız istenen yapay zekâ gruplarından toplanır.
    // Arama motorları hiçbir durumda girmez: adresleri bilerek toplu yazılır
    // (bkz. yolOzeti), sayfa sayfa bir şey söylemez.
    if (grup !== 'arama' && sayfaGruplari.includes(grup) && s.yol !== '(diğer)') {
      sayfalar.set(s.yol, (sayfalar.get(s.yol) ?? 0) + adet)
    }
  }

  const grupSirasi: Record<TarayiciGrubu, number> = { asistan: 0, egitim: 1, arama: 2 }
  return {
    tarayicilar: [...tarayicilar.values()].sort(
      (a, b) => grupSirasi[a.grup] - grupSirasi[b.grup] || b.ziyaret - a.ziyaret || a.ad.localeCompare(b.ad)
    ),
    sayfalar: [...sayfalar.entries()]
      .map(([yol, ziyaret]) => ({ yol, ziyaret }))
      .sort((a, b) => b.ziyaret - a.ziyaret || a.yol.localeCompare(b.yol))
      .slice(0, sayfaAdedi),
    toplam,
  }
}

export async function tarayiciRaporu(bas: Date, bit: Date): Promise<TarayiciRaporu> {
  try {
    const supabase = createServiceClient()
    // Bitiş anı aralığa dahil değil (ör. "dün" için bugünün 00:00'ı).
    const sonGun = istanbulGunu(new Date(Math.max(bas.getTime(), bit.getTime() - 1)))
    const { data, error } = await supabase
      .from('tarayici_ziyaretleri')
      .select('gun, tarayici, grup, yol, adet, son_gorulme')
      .gte('gun', istanbulGunu(bas))
      .lte('gun', sonGun)
      .order('adet', { ascending: false })
      .limit(5000)
    if (error) return BOS
    return { kurulu: true, sayilanGruplar: [...SAYILAN_GRUPLAR], ...tarayiciOzeti((data ?? []) as HamSatir[]) }
  } catch {
    return BOS
  }
}
