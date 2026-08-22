import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { validateCampaign } from '@/lib/panel/campaignValidation'
import { hedefVeKademeYaz } from '@/lib/panel/kampanyaYaz'

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { row, hedefler, kademeler, error } = validateCampaign(body)
  if (error || !row) return NextResponse.json({ error }, { status: 400 })

  const supabase = createServiceClient()

  // Kod benzersizliği (kod tanımlıysa)
  if (row.code) {
    const { data: mevcut } = await supabase
      .from('campaigns')
      .select('id')
      .ilike('code', String(row.code))
      .maybeSingle()
    if (mevcut) return NextResponse.json({ error: 'Bu kod zaten kullanılıyor' }, { status: 409 })
  }

  const { data, error: dbErr } = await supabase.from('campaigns').insert(row).select('id').single()
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const { v2Hazir } = await hedefVeKademeYaz(
    supabase,
    data.id,
    String(row.scope ?? 'cart'),
    hedefler ?? [],
    kademeler ?? []
  )
  return NextResponse.json({ ok: true, id: data.id, v2Hazir })
}
