import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { havaleAyariDogrula } from '@/lib/odeme/havale'
import { havaleAyariOku, havaleAyariYaz } from '@/lib/odeme/havaleAyari'

export const dynamic = 'force-dynamic'

/** Panel → Ayarlar → Havale / EFT: oku ve kaydet. */
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ ayar: await havaleAyariOku() })
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const sonuc = havaleAyariDogrula(body)
  if ('hata' in sonuc) return NextResponse.json({ error: sonuc.hata }, { status: 400 })
  const yaz = await havaleAyariYaz(sonuc.ayar)
  if ('hata' in yaz) return NextResponse.json({ error: yaz.hata }, { status: 500 })
  return NextResponse.json({ ok: true, ayar: sonuc.ayar })
}
