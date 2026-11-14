import { NextResponse, after } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { basarisizlariTekrarla, kuyrugaIsle } from '@/lib/trendyol/stokKuyrugu'
import { vitriniYenile } from '@/lib/cache/vitrin'

export const dynamic = 'force-dynamic'

/** Panel: başarısız stok yazımlarını yeniden kuyruğa alır ve hemen dener. */
export async function POST() {
  after(vitriniYenile) // vitrin önbelleğini yanıt sonrası tazeler (lib/cache/vitrin)
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tekrarlanan = await basarisizlariTekrarla()
  const sonuc = await kuyrugaIsle()
  return NextResponse.json({ ok: true, tekrarlanan, sonuc })
}
