import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { validateCampaign } from '@/lib/panel/campaignValidation'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const { row, error } = validateCampaign(body)
  if (error || !row) return NextResponse.json({ error }, { status: 400 })

  const supabase = createServiceClient()

  if (row.code) {
    const { data: mevcut } = await supabase
      .from('campaigns')
      .select('id')
      .ilike('code', String(row.code))
      .neq('id', id)
      .maybeSingle()
    if (mevcut) return NextResponse.json({ error: 'Bu kod başka kampanyada kullanılıyor' }, { status: 409 })
  }

  const { data, error: dbErr } = await supabase
    .from('campaigns')
    .update(row)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Kampanya bulunamadı' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
