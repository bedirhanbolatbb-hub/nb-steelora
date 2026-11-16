import { NextResponse, after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { odemeBildirimleriniGonder } from '@/lib/odeme/odemeSonrasi'
import { alan, donusImzasiDogru, toslaKimligi } from '@/lib/tosla/client'
import { KART_SIPARIS_DESENI, kartOdemesiniTamamla } from '@/lib/tosla/kartOdemesi'

/**
 * Tosla ödeme dönüşü (12 Kasım 2026).
 *
 * Tosla 3D sonucunu müşterinin TARAYICISI üzerinden buraya POST eder
 * (bazı bankalarda GET). Siteler arası bir form gönderimi: oturum çerezi
 * gelmeyebilir, kimlik yalnız sipariş numarasından okunur.
 *
 * KARAR BURADA VERİLMEZ: dönüş imzası doğrulanır (tutmazsa iz bırakılır),
 * sonra lib/tosla/kartOdemesi siparişi Tosla'ya sunucudan sunucuya sorar ve
 * ancak "ödendi" ve tutar kuruşu kuruşuna ise siparişi açar. Dönüşü taklit
 * eden biri hiçbir siparişi ödenmiş yaptıramaz.
 *
 * Kimlik için TOSLA_ODEME_ACIK aranmaz: kart kabulü tam bu sırada kapatılsa
 * bile, müşterinin yarıda kalan ödemesi sonuçlanmalı.
 */
export const dynamic = 'force-dynamic'
// Zincir: Tosla sorgusu + stok + kupon + Trendyol kuyruğu (bildirimler yanıttan sonra).
export const maxDuration = 60

function yonlendir(yol: string): NextResponse {
  const taban = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nbsteelora.com')
    .replace('://nbsteelora.com', '://www.nbsteelora.com')
    .replace(/\/+$/, '')
  // 303: tarayıcı POST'u tekrarlamaz, sayfayı GET ile açar.
  return NextResponse.redirect(`${taban}${yol}`, { status: 303 })
}

async function alanlariOku(request: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  new URL(request.url).searchParams.forEach((v, k) => { out[k] = v })
  if (request.method !== 'POST') return out
  try {
    const tur = request.headers.get('content-type') ?? ''
    if (tur.includes('application/json')) {
      const j = (await request.json()) as Record<string, unknown> | null
      for (const [k, v] of Object.entries(j ?? {})) if (v !== null && v !== undefined) out[k] = String(v)
    } else {
      const f = await request.formData()
      f.forEach((v, k) => { if (typeof v === 'string') out[k] = v })
    }
  } catch {
    // Gövde okunamadı — sorgu dizgisindekiyle devam.
  }
  return out
}

async function isle(request: Request): Promise<NextResponse> {
  const alanlar = await alanlariOku(request)
  const ham = alan(alanlar, 'OrderId')
  const siparisNo = typeof ham === 'string' ? ham.trim() : ''
  if (!KART_SIPARIS_DESENI.test(siparisNo)) {
    console.warn('[tosla-donus] sipariş numarası yok ya da biçimsiz')
    return yonlendir('/odeme/basarisiz')
  }
  const kimlik = toslaKimligi()
  if (!kimlik) {
    console.error('[tosla-donus] Tosla kimliği tanımsız — dönüş işlenemedi', siparisNo)
    return yonlendir(`/odeme/basarisiz?durum=kontrol&siparis=${encodeURIComponent(siparisNo)}`)
  }
  if (!donusImzasiDogru(kimlik, alanlar)) {
    console.warn(`[tosla-donus] dönüş imzası tutmadı (karar yine sorgudan) | ${siparisNo}`)
  }

  const db = createServiceClient()
  const r = await kartOdemesiniTamamla(db, siparisNo, { kimlik, etiket: '[tosla-donus]' })
  // `odeme=kart`: teşekkür sayfası ödemeyi yeniden doğrular ve sepeti boşaltır.
  const tamam = `/siparis-tamamlandi?siparis=${encodeURIComponent(siparisNo)}&odeme=kart`
  switch (r.sonuc) {
    case 'odendi': {
      // Bildirimler müşterinin "teşekkürler" sayfasını bekletmez (Faz 29 düzeni).
      const siparis = r.siparis
      after(async () => {
        await odemeBildirimleriniGonder(siparis, { yonetici: true })
      })
      return yonlendir(tamam)
    }
    case 'zaten':
      return yonlendir(tamam)
    case 'basarisiz': {
      const neden = (r.neden ?? '').slice(0, 120)
      return yonlendir(`/odeme/basarisiz${neden ? `?neden=${encodeURIComponent(neden)}` : ''}`)
    }
    case 'kapali':
    case 'bulunamadi':
      return yonlendir('/odeme/basarisiz')
    case 'bekliyor':
    case 'inceleme':
    case 'hata':
    default:
      // Ödeme alınmış olabilir: müşteriye "kontrol ediliyor" denir; gecelik
      // süpürge siparişi yeniden sorar, inceleme BB'ye mail olarak gitti.
      if (r.sonuc === 'hata') console.error(`[tosla-donus] tamamlanamadı | ${siparisNo} | ${r.neden}`)
      return yonlendir(`/odeme/basarisiz?durum=kontrol&siparis=${encodeURIComponent(siparisNo)}`)
  }
}

export async function POST(request: Request) {
  try {
    return await isle(request)
  } catch (e) {
    console.error('[tosla-donus] beklenmeyen hata:', e instanceof Error ? e.message : String(e))
    return yonlendir('/odeme/basarisiz?durum=kontrol')
  }
}

// Bazı bankalar dönüşü GET ile yapıyor; aynı işleyiş.
export async function GET(request: Request) {
  try {
    return await isle(request)
  } catch (e) {
    console.error('[tosla-donus] beklenmeyen hata:', e instanceof Error ? e.message : String(e))
    return yonlendir('/odeme/basarisiz?durum=kontrol')
  }
}
