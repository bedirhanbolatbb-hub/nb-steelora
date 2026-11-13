import { NextResponse } from 'next/server'
import { adminIstegiMi, cronIstegiMi } from '@/lib/admin/requireAdmin'
import { faturaIsi } from '@/lib/fatura/is'
import { ozetiGonder } from '@/lib/fatura/ozet'

/**
 * Otomatik fatura (13 Kas 2026) — ayrıntı: lib/fatura/is.ts, docs/fatura-otomatik.md.
 *
 *  GET  cron        : FATURA_OTOMATIK=evet ise faturası olmayan siparişlere
 *                     e-Arşiv taslağı açar, gerekirse BB'ye özet maili atar.
 *  GET  panel oturumu: önizleme — neyin kesileceğini gösterir, HİÇBİR şey açmaz.
 *  POST panel oturumu: şimdi kes (anahtar kapalı olsa da; bilerek tetiklenir).
 *
 * Panel karşılığı: buton yok; sonuç maille gelir, önizleme bu uçtan okunur.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (cronIstegiMi(request)) {
    if (process.env.FATURA_OTOMATIK?.trim() !== 'evet') return NextResponse.json({ kapali: true })
    const sonuc = await faturaIsi('kes')
    const mail = await ozetiGonder(sonuc).catch((e: Error) => `hata: ${e.message}`)
    return NextResponse.json({
      kesildi: sonuc.kesildi.length,
      elle: sonuc.elle.length,
      uyari: sonuc.uyari.length,
      hata: sonuc.hatalar.length,
      mail,
    })
  }
  if (await adminIstegiMi(request)) return NextResponse.json(await faturaIsi('onizleme'))
  return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
}

export async function POST(request: Request) {
  if (!(await adminIstegiMi(request))) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const kaynak = request.headers.get('origin')
  if (kaynak && kaynak !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  const sonuc = await faturaIsi('kes')
  const mail = await ozetiGonder(sonuc, true).catch((e: Error) => `hata: ${e.message}`)
  return NextResponse.json({ ...sonuc, mail })
}
