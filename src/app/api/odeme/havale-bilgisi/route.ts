import { NextResponse } from 'next/server'
import { havaleAyariOku } from '@/lib/odeme/havaleAyari'
import { havaleHazirMi, havaleIndirimiAktifMi, ibanBicimle } from '@/lib/odeme/havale'

export const dynamic = 'force-dynamic'

/**
 * Ödeme ekranının havale bilgisi (7 Kas 2026). Herkese açık: IBAN zaten
 * ödeme yapacak kişiye gösterilmek için var. Hesap sahibi sitedeki satıcı
 * adıyla aynıdır — müşteri parayı kime gönderdiğini sipariş öncesi görür.
 */
export async function GET() {
  const ayar = await havaleAyariOku()
  if (!havaleHazirMi(ayar)) {
    return NextResponse.json({ hazir: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const simdi = new Date()
  return NextResponse.json(
    {
      hazir: true,
      banka: ayar.banka,
      alici: ayar.alici,
      iban: ibanBicimle(ayar.iban),
      indirim: havaleIndirimiAktifMi(ayar, simdi)
        ? { oran: ayar.indirimOrani, bitis: ayar.indirimBitis }
        : null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
