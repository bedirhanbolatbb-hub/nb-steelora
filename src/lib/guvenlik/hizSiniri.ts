import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'node:crypto'

/**
 * Kalıcı hız sınırı (Faz 27).
 *
 * Kod tabanındaki TEK hız sınırı /api/reviews içindeki bellek içi bir `Map`
 * idi ve Vercel'de hiçbir şey engellemiyordu: her istek başka bir sunucusuz
 * örnekte çalışabildiği için sayaç neredeyse her seferinde sıfırdan başlıyor,
 * üstelik 5000 anahtarı aşınca `hits.clear()` HERKESİN sayacını siliyordu.
 * Faz 19'da aynı gerekçe yazılmıştı; sayaç bu yüzden veritabanına taşındı.
 *
 * KAPALI DEĞİL, AÇIK BAŞARISIZ OLUR: tablo yoksa ya da veritabanı erişilemezse
 * istek GEÇER. Gerekçe: hız sınırı bir savunma katmanıdır, ana kapı değil.
 * Supabase bir dakikalığına erişilemez olduğunda tüm siteyi kapatmak, kötüye
 * kullanımı engellemekten çok daha büyük bir zarar verirdi. Tablo yokluğu
 * sunucu günlüğüne bir kez düşer.
 */

export type SinirSonucu = {
  /** İstek işlenmeli mi? */
  gecer: boolean
  /** Pencerede kalan hak (bilgi amaçlı). */
  kalan: number
  /** Sınıra takıldıysa kaç saniye sonra tekrar denenebilir. */
  bekleSaniye: number
}

let tabloYok = false

/**
 * İstek sahibinin kimliği.
 *
 * IP SAKLANMAZ: adres, günlük tuzla birlikte özetlenir. Böylece sayaç çalışır
 * ama tabloda kimin hangi adresle geldiğini gösteren bir kayıt oluşmaz —
 * analitikteki çerezsiz kimlik yaklaşımıyla aynı ilke (KVKK veri minimizasyonu).
 */
export function istekKimligi(request: Request, ek?: string | null): string {
  const h = request.headers
  const ham =
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'bilinmiyor'
  const tuz = process.env.ANALYTICS_SALT || process.env.ADMIN_SECRET_TOKEN || 'nb'
  const gun = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${tuz}|${gun}|${ham}|${ek ?? ''}`).digest('hex').slice(0, 40)
}

/**
 * Pencere başına sayaç.
 *
 * @param anahtar  Uç adı + istek sahibi ("giris:ab12…").
 * @param azami    Pencerede izin verilen istek sayısı.
 * @param pencereSn Pencere uzunluğu (saniye).
 */
export async function hizSiniri(
  anahtar: string,
  azami: number,
  pencereSn: number
): Promise<SinirSonucu> {
  if (tabloYok) return { gecer: true, kalan: azami, bekleSaniye: 0 }

  const simdi = Date.now()
  // Pencere başlangıcı sabit dilimlere yuvarlanır: kayan pencere yerine sabit
  // dilim, tek bir upsert ile çalışır ve yarış durumuna dayanıklıdır.
  const dilim = Math.floor(simdi / (pencereSn * 1000))
  const kimlik = `${anahtar}:${dilim}`

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('hiz_sayaci_arttir', {
      p_anahtar: kimlik,
      p_gecerlilik: new Date((dilim + 1) * pencereSn * 1000).toISOString(),
    })

    if (error) {
      // 42883 = fonksiyon yok, 42P01 = tablo yok → DDL henüz çalıştırılmamış.
      if (error.code === '42883' || error.code === '42P01') {
        tabloYok = true
        console.warn(
          '[hızSınırı] sayaç tablosu/fonksiyonu yok — sınır uygulanmıyor. ' +
            'docs/guvenlik/01-hiz-sayaci.sql çalıştırılmalı.'
        )
      } else {
        console.error('[hızSınırı] sayaç okunamadı:', error.message)
      }
      return { gecer: true, kalan: azami, bekleSaniye: 0 }
    }

    const sayi = Number(data) || 0
    const kalan = Math.max(0, azami - sayi)
    const bekle = Math.max(1, Math.ceil(((dilim + 1) * pencereSn * 1000 - simdi) / 1000))
    return { gecer: sayi <= azami, kalan, bekleSaniye: bekle }
  } catch (e: any) {
    console.error('[hızSınırı] beklenmeyen hata:', e?.message)
    return { gecer: true, kalan: azami, bekleSaniye: 0 }
  }
}

/** Sınıra takılan istek için standart yanıt. */
export function cokFazlaIstek(bekleSaniye: number): Response {
  return new Response(
    JSON.stringify({ error: 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(bekleSaniye),
        'Cache-Control': 'no-store',
      },
    }
  )
}
