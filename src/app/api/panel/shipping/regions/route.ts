import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { bolgeleriSenkronla, illeriGetir, ilceleriGetir } from '@/lib/shipping/geo'

export const maxDuration = 60

/** İl listesi (?state_id= ile o ilin ilçeleri). */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stateId = Number(new URL(request.url).searchParams.get('state_id')) || 0
  if (stateId) return NextResponse.json({ regions: await ilceleriGetir(stateId) })

  let iller = await illeriGetir()
  // Önbellek boşsa ilk istekte sağlayıcıdan doldurulur.
  if (iller.length === 0) {
    await bolgeleriSenkronla()
    iller = await illeriGetir()
  }
  return NextResponse.json({ regions: iller })
}

/** Listeyi sağlayıcıdan yeniden çeker (panel "listeyi yenile"). */
export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const sonuc = await bolgeleriSenkronla()
    return NextResponse.json({ ok: true, ...sonuc })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Senkron başarısız' }, { status: 502 })
  }
}
