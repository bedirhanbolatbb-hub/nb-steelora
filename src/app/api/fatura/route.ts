import { NextResponse } from 'next/server'
import { adminIstegiMi, cronIstegiMi } from '@/lib/admin/requireAdmin'
import { faturaIsi } from '@/lib/fatura/is'
import { ozetiGonder } from '@/lib/fatura/ozet'
import { pdfOnizlemesi } from '@/lib/fatura/yukleme'
import { yuklemeAcikMi, yuklemeyiAyarla } from '@/lib/fatura/anahtar'
import { trendyolDosyasiniOku } from '@/lib/fatura/dosyaDogrula'
import { siparisPaketleri } from '@/lib/fatura/trendyolSiparis'

/**
 * Otomatik fatura — ayrıntı: lib/fatura/is.ts, docs/fatura-otomatik.md.
 *
 *  GET  cron        : FATURA_OTOMATIK=evet ise faturası olmayan siparişlere
 *                     e-Arşiv taslağı açar; yükleme anahtarı açıksa
 *                     (lib/fatura/anahtar.ts) imzalı faturaları Trendyol'a
 *                     yükler; gerekirse BB'ye özet atar.
 *  GET  panel oturumu: önizleme — neyin kesileceğini ve yükleneceğini
 *                     gösterir, HİÇBİR şey yazmaz.
 *       ?pdf=<sipariş no>: o siparişin Trendyol'a gidecek PDF'si (aynı
 *                     denetimlerle; imzasız taslağınki de gösterilir).
 *  POST panel oturumu: şimdi kes (anahtar kapalı olsa da; bilerek tetiklenir).
 *       ?yukle=evet  : imzalıları da yükle (anahtara bakmadan).
 *       ?yukleme=ac | kapat: sabah turunun yükleme anahtarı.
 *
 * Panel karşılığı: buton yok; sonuç maille gelir, önizleme bu uçtan okunur.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (cronIstegiMi(request)) {
    if (process.env.FATURA_OTOMATIK?.trim() !== 'evet') return NextResponse.json({ kapali: true })
    const sonuc = await faturaIsi('kes', { yukle: await yuklemeAcikMi() })
    const mail = await ozetiGonder(sonuc).catch((e: Error) => `hata: ${e.message}`)
    return NextResponse.json({
      kesildi: sonuc.kesildi.length,
      yukleme: sonuc.yukleme,
      yuklendi: sonuc.yuklendi.length,
      imzaBekleyen: sonuc.imzaBekleyen,
      elle: sonuc.elle.length,
      uyari: sonuc.uyari.length,
      hata: sonuc.hatalar.length,
      mail,
    })
  }
  if (await adminIstegiMi(request)) {
    // ?dosya=<sipariş>: Trendyol'un o siparişte sakladığı fatura dosyasındaki
    // belge numaraları (kişisel veri dönmez). Günlük denetim ve teşhis için.
    const dosyaSiparis = new URL(request.url).searchParams.get('dosya')?.trim()
    if (dosyaSiparis) {
      if (!/^\d{6,15}$/.test(dosyaSiparis)) return NextResponse.json({ hata: 'geçersiz sipariş no' }, { status: 400 })
      let paketler: Awaited<ReturnType<typeof siparisPaketleri>>
      try {
        paketler = await siparisPaketleri(dosyaSiparis)
      } catch (e) {
        return NextResponse.json({ siparis: dosyaSiparis, durum: 'Trendyol okunamadı', neden: (e as Error).message }, { status: 502 })
      }
      if (paketler.length !== 1) return NextResponse.json({ siparis: dosyaSiparis, durum: `${paketler.length} paket` })
      const link = paketler[0].invoiceLink
      if (!link) return NextResponse.json({ siparis: dosyaSiparis, durum: 'pakette fatura yok' })
      const o = await trendyolDosyasiniOku(String(link))
      if (!o.ok) return NextResponse.json({ siparis: dosyaSiparis, durum: 'okunamadı', neden: o.neden })
      return NextResponse.json({
        siparis: dosyaSiparis,
        durum: 'okundu',
        belgeler: o.belgeler,
        ettn: o.ettn,
        sayfa: o.sayfa,
        imzasiz: o.imzasiz,
      })
    }
    const pdfSiparis = new URL(request.url).searchParams.get('pdf')
    if (pdfSiparis) {
      const o = await pdfOnizlemesi(pdfSiparis.trim())
      if ('hata' in o) return NextResponse.json({ hata: o.hata }, { status: 422 })
      return new Response(new Uint8Array(o.pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${o.dosyaAdi}"`,
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      })
    }
    const [sonuc, otomatikYukleme] = await Promise.all([faturaIsi('onizleme'), yuklemeAcikMi()])
    return NextResponse.json({ ...sonuc, otomatikYukleme: otomatikYukleme ? 'açık' : 'kapalı' })
  }
  return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
}

export async function POST(request: Request) {
  if (!(await adminIstegiMi(request))) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const kaynak = request.headers.get('origin')
  if (kaynak && kaynak !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  const parametre = new URL(request.url).searchParams
  const anahtar = parametre.get('yukleme')
  if (anahtar === 'ac' || anahtar === 'kapat') {
    await yuklemeyiAyarla(anahtar === 'ac')
    return NextResponse.json({ otomatikYukleme: (await yuklemeAcikMi()) ? 'açık' : 'kapalı' })
  }

  const sonuc = await faturaIsi('kes', { yukle: parametre.get('yukle') === 'evet' })
  const mail = await ozetiGonder(sonuc, true).catch((e: Error) => `hata: ${e.message}`)
  return NextResponse.json({ ...sonuc, mail })
}
