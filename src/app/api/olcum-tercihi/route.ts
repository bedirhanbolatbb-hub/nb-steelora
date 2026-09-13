import { NextResponse } from 'next/server'
import {
  OLCUM_KAPALI,
  OLCUM_TERCIH_COOKIE,
  OLCUM_TERCIH_MAX_AGE,
} from '@/lib/analytics/kendiTrafik'

export const dynamic = 'force-dynamic'

/**
 * "Beni ölçme" anahtarı (Faz 32).
 *
 * Panel çerezi taşıyan tarayıcı zaten ölçülmüyor; bu adres telefon gibi panele
 * girilmeyen cihazlar için. Bağlantı bir kez açılır, tercih bir yıl yaşar.
 *
 *   /api/olcum-tercihi?durum=kapali → bu tarayıcı sayılmaz
 *   /api/olcum-tercihi?durum=acik   → normale döner
 *
 * Kişisel veri yazılmaz, yalnız bir tercih çerezi konur.
 */
export async function GET(request: Request) {
  const durum = new URL(request.url).searchParams.get('durum')
  const kapat = durum === OLCUM_KAPALI

  const govde =
    '<!doctype html><html lang="tr"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Ölçüm tercihi</title>' +
    '<body style="font:16px/1.6 system-ui;margin:0;padding:48px 20px;background:#faf9f7;color:#1a1a1a">' +
    '<div style="max-width:420px;margin:0 auto">' +
    '<p style="font-size:20px;margin:0 0 12px">' +
    (kapat ? 'Bu cihaz artık sayılmıyor.' : 'Bu cihaz normal şekilde sayılıyor.') +
    '</p><p style="color:#666;margin:0">' +
    (kapat
      ? 'Buradan yaptığınız ziyaretler panel istatistiklerine girmeyecek.'
      : 'Ölçümü kapatmak için adresin sonuna ?durum=kapali ekleyin.') +
    '</p></div></body></html>'

  const yanit = new NextResponse(govde, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })

  if (kapat) {
    yanit.cookies.set(OLCUM_TERCIH_COOKIE, OLCUM_KAPALI, {
      maxAge: OLCUM_TERCIH_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: true,
    })
  } else {
    yanit.cookies.set(OLCUM_TERCIH_COOKIE, '', { maxAge: 0, path: '/' })
  }
  return yanit
}
