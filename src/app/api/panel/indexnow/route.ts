import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { indexNowBildir } from '@/lib/indexnow'
import siteHaritasi from '@/app/sitemap'

export const maxDuration = 30

/**
 * Panel: IndexNow'a toplu bildirim (Kasım 2026).
 *
 * Gövde `{ adresler?: string[] }`. Boş gelirse site haritasındaki TÜM
 * adresler gönderilir — ilk kurulumda ya da büyük bir içerik yenilemesinden
 * sonra bir kez. Günlük akışta ayrıca çağırmak gerekmez: senkron değişen
 * ürünleri, blog kaydı da yayımlanan yazıyı kendisi bildirir.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const govde = await request.json().catch(() => null)
  const verilen: string[] = Array.isArray(govde?.adresler)
    ? govde.adresler.filter((a: unknown): a is string => typeof a === 'string')
    : []

  const adresler = verilen.length > 0 ? verilen : (await siteHaritasi()).map((g) => g.url)
  const sonuc = await indexNowBildir(adresler)
  const basarili = sonuc.durum !== null && sonuc.durum < 300
  return NextResponse.json({ ...sonuc, toplam: adresler.length }, { status: basarili ? 200 : 502 })
}
