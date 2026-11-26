import { NextResponse } from 'next/server'
import { adminIstegiMi } from '@/lib/admin/requireAdmin'
import { trendyolaFatura } from '@/lib/fatura/trendyolaFaturaIsi'

/**
 * Trendyol'a kesilecek fatura (26 Kas 2026) — yalnız panel oturumuyla.
 * Ayrıntı: lib/fatura/trendyolaFatura.ts, docs/fatura-otomatik.md.
 *
 *  GET  ?kod=&tutar=&oran=&kalem=&kaynak=&kaynakTarih=  önizleme, hiçbir şey yazmaz
 *  POST aynı parametreler + onay=evet                   taslağı açar (imzasız)
 *
 *  kod         Trendyol'un Fatura Kodu (KRM_1181208_251126)
 *  tutar       KDV dahil tutar, nokta ile (22.97)
 *  oran        KDV oranı (1, 10, 20)
 *  kalem       fatura kaleminin adı
 *  kaynak      alıcının kopyalanacağı, daha önce Trendyol'a kesilmiş imzalı belge
 *  kaynakTarih o belgenin yaklaşık tarihi (gg/aa/yyyy; ±14 gün aranır)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function girdiler(url: string) {
  const p = new URL(url).searchParams
  const al = (k: string) => (p.get(k) ?? '').trim()
  return {
    girdi: { kod: al('kod').toUpperCase(), toplam: Number(al('tutar')), oran: Number(al('oran')), kalem: al('kalem') },
    kaynak: { belge: al('kaynak').toUpperCase(), tarih: al('kaynakTarih') },
    onay: al('onay'),
  }
}

const yanit = (govde: unknown, durum = 200) =>
  NextResponse.json(govde, { status: durum, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex' } })

export async function GET(request: Request) {
  if (!(await adminIstegiMi(request))) return yanit({ error: 'Yetkisiz' }, 401)
  const { girdi, kaynak } = girdiler(request.url)
  const s = await trendyolaFatura('onizleme', girdi, kaynak)
  return yanit(s, s.tamam ? 200 : 422)
}

export async function POST(request: Request) {
  if (!(await adminIstegiMi(request))) return yanit({ error: 'Yetkisiz' }, 401)
  const kaynakBaslik = request.headers.get('origin')
  if (!kaynakBaslik || kaynakBaslik !== new URL(request.url).origin) return yanit({ error: 'Yetkisiz' }, 403)
  const { girdi, kaynak, onay } = girdiler(request.url)
  if (onay !== 'evet') return yanit({ tamam: false, neden: 'onay=evet olmadan taslak açılmaz' }, 400)
  const s = await trendyolaFatura('kes', girdi, kaynak)
  return yanit(s, s.tamam ? 200 : 422)
}
