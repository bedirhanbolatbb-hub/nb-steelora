import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'

export const dynamic = 'force-dynamic'

/**
 * Resend olay bildiriminin kurulumu (Faz 34).
 *
 * Resend'e "bir mail geri dönünce ya da spam işaretlenince şu adrese haber
 * ver" kaydı açar. Bir kez çalışması yeter; tekrar çalıştırmak zararsızdır
 * (kayıt varsa olaylarını tamamlar, yenisini açmaz). İmza sırrı SAKLANMAZ:
 * alıcı uç gelen yüke güvenmeyip maili Resend'den kendisi okuyor.
 */

const UC = 'https://www.nbsteelora.com/api/resend/olay'
const OLAYLAR = ['email.bounced', 'email.complained']

type Kayit = { id: string; endpoint: string; status: string; events: string[] | null }

async function resend(yol: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.resend.com${yol}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
  const govde = await r.json().catch(() => null)
  return { durum: r.status, govde }
}

async function mevcutKayit(): Promise<{ kayit: Kayit | null; hata?: string }> {
  const { durum, govde } = await resend('/webhooks')
  if (durum !== 200) return { kayit: null, hata: `liste okunamadı (HTTP ${durum})` }
  const liste: Kayit[] = Array.isArray(govde?.data) ? govde.data : []
  return { kayit: liste.find((w) => w.endpoint === UC) ?? null }
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { kayit, hata } = await mevcutKayit()
  if (hata) return NextResponse.json({ error: hata }, { status: 502 })
  return NextResponse.json({ kurulu: Boolean(kayit), kayit })
}

export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { kayit, hata } = await mevcutKayit()
  if (hata) return NextResponse.json({ error: hata }, { status: 502 })

  if (kayit) {
    const eksik = OLAYLAR.filter((o) => !(kayit.events ?? []).includes(o))
    if (!eksik.length && kayit.status === 'enabled') {
      return NextResponse.json({ ok: true, islem: 'zaten-kurulu', id: kayit.id })
    }
    const { durum } = await resend(`/webhooks/${kayit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        endpoint: UC,
        events: Array.from(new Set([...(kayit.events ?? []), ...OLAYLAR])),
        status: 'enabled',
      }),
    })
    if (durum !== 200) return NextResponse.json({ error: `güncellenemedi (HTTP ${durum})` }, { status: 502 })
    return NextResponse.json({ ok: true, islem: 'guncellendi', id: kayit.id })
  }

  const { durum, govde } = await resend('/webhooks', {
    method: 'POST',
    body: JSON.stringify({ endpoint: UC, events: OLAYLAR }),
  })
  if (durum !== 200 && durum !== 201) {
    return NextResponse.json({ error: `kurulamadı (HTTP ${durum})`, ayrinti: govde?.message ?? null }, { status: 502 })
  }
  return NextResponse.json({ ok: true, islem: 'kuruldu', id: govde?.id ?? null })
}
