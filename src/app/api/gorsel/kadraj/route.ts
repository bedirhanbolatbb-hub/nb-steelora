import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { kadrajHesapla, urunKutusu } from '@/lib/gorsel/odak'
import { KADRAJ_GENISLIKLERI, KADRAJ_ORANLARI, type KadrajOrani, trendyolOzgun } from '@/lib/gorsel/kadraj'
import { gorselBoyutu, trendyolCdnMi } from '@/lib/images'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

/**
 * Vitrin kadrajı ucu (Faz 35).
 *
 * `?u=<Trendyol görseli>&w=<en>&o=<oran>&v=<sürüm>` → takıya göre kadrajlanmış
 * WebP. Yanıt bir yıl önbelleğe yazılır (adres içerikle birebir: aynı adres
 * hep aynı görsel). Uç yalnız önbellek boşken çalışır.
 *
 * Kötüye kullanım sınırı: yalnız KENDİ ürünlerimizin görselleri işlenir
 * (başkasının Trendyol görseliyle sunucu yorulmaz), yalnız sabit genişlik ve
 * oranlar üretilir, IP başına kalıcı sayaç vardır.
 *
 * Hata hâlinde ürün kartı boş kalmaz: uç özgün görsele yönlendirir.
 */

/** Oran başına kadraj ayarı: pay = ürün çevresi boşluk, enKucuk = en fazla yakınlaşma. */
const AYAR: Record<KadrajOrani, { pay: number; enKucuk: number }> = {
  '45': { pay: 1.6, enKucuk: 0.48 },
  '34': { pay: 1.7, enKucuk: 0.55 },
  '11': { pay: 1.7, enKucuk: 0.7 },
}

const ANALIZ_EN = 240
const YIL = 31536000

/** Kendi ürün görsellerimiz — örnek başına 10 dk tutulur (yalnız hız için; doğruluk ona bağlı değil). */
const g = globalThis as unknown as { __nbKadrajGorselleri?: { at: number; liste: Set<string> } }
async function bizimGorsellerimiz(): Promise<Set<string>> {
  const simdi = Date.now()
  if (g.__nbKadrajGorselleri && simdi - g.__nbKadrajGorselleri.at < 10 * 60_000) return g.__nbKadrajGorselleri.liste
  const supabase = createServiceClient()
  const { data } = await supabase.from('products').select('trendyol_images, override_images')
  const liste = new Set<string>()
  for (const r of (data ?? []) as { trendyol_images: string[] | null; override_images: string[] | null }[]) {
    for (const u of [...(r.trendyol_images ?? []), ...(r.override_images ?? [])]) {
      if (typeof u === 'string' && trendyolCdnMi(u)) liste.add(trendyolOzgun(u))
    }
  }
  g.__nbKadrajGorselleri = { at: simdi, liste }
  return liste
}

function yonlendir(hedef: string) {
  return new Response(null, { status: 302, headers: { Location: hedef, 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ham = url.searchParams.get('u') ?? ''
  const w = Number(url.searchParams.get('w'))
  const o = (url.searchParams.get('o') ?? '45') as KadrajOrani

  if (!trendyolCdnMi(ham) || !/\.(jpe?g|png|webp)$/i.test(new URL(ham).pathname)) {
    return new Response('Geçersiz görsel', { status: 400 })
  }
  if (!(KADRAJ_GENISLIKLERI as readonly number[]).includes(w) || !(o in KADRAJ_ORANLARI)) {
    return new Response('Geçersiz boyut', { status: 400 })
  }
  const ozgun = trendyolOzgun(ham)

  try {
    if (!(await bizimGorsellerimiz()).has(ozgun)) {
      // Katalogda yok (ya da yeni eklendi ve liste henüz tazelenmedi): işlemeden
      // özgün görsele yönlendir — kart yine dolu görünür.
      return yonlendir(gorselBoyutu(ozgun, w))
    }

    if (!(await isAdminRequest())) {
      const sinir = await hizSiniri(`kadraj:${istekKimligi(request)}`, 600, 600)
      if (!sinir.gecer) return yonlendir(gorselBoyutu(ozgun, w))
    }

    const yanit = await fetch(ozgun, { signal: AbortSignal.timeout(8000) })
    if (!yanit.ok) return yonlendir(gorselBoyutu(ozgun, w))
    const kaynak = Buffer.from(await yanit.arrayBuffer())

    const sharp = (await import('sharp')).default
    // Tek çözümleme: tam boy ham piksel bir kez çıkarılır, analiz ve kırpım
    // aynı tampondan yapılır.
    const { data: tam, info } = await sharp(kaynak, { failOn: 'none' })
      .rotate()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const hamPiksel = { raw: { width: info.width, height: info.height, channels: 3 as const } }
    const { data: kucuk, info: ki } = await sharp(tam, hamPiksel)
      .resize(ANALIZ_EN)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const kutu = urunKutusu(kucuk, ki.width, ki.height, ki.channels)
    const { pay, enKucuk } = AYAR[o]
    const kirp = kadrajHesapla(kutu, info.width, info.height, KADRAJ_ORANLARI[o], pay, enKucuk)

    const cikti = await sharp(tam, hamPiksel)
      .extract(kirp)
      .resize({ width: Math.min(w, kirp.width) })
      .webp({ quality: 80, effort: 4 })
      .toBuffer()

    return new Response(new Uint8Array(cikti), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': `public, max-age=${YIL}, s-maxage=${YIL}, immutable`,
        // Doğrulama için: bulunan ürün kutusu (kaynağın kesri) — boşsa ortadan kırpıldı.
        'X-Kadraj': kutu
          ? [kutu.x0, kutu.y0, kutu.x1, kutu.y1].map((v) => v.toFixed(3)).join(',')
          : 'orta',
      },
    })
  } catch (e) {
    console.error('[kadraj] işlenemedi:', e instanceof Error ? e.message : e)
    return yonlendir(gorselBoyutu(ozgun, w))
  }
}
