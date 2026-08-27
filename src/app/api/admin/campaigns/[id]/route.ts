import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { recalcProductReviewStats } from '@/lib/admin/reviewAggregates'

// Yorum moderasyonunda yalnız bu alan değiştirilebilir.
const REVIEW_FIELDS = ['is_approved'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const type = new URL(request.url).searchParams.get('type')

  // reviews'a yazım RLS ile kapalı; moderasyon service role ile yapılır.
  const supabase = createServiceClient()

  if (type === 'review') {
    const update: Record<string, unknown> = {}
    for (const field of REVIEW_FIELDS) {
      if (field in body) update[field] = body[field]
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(update)
      .eq('id', id)
      .select('product_id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Onay durumu değiştiyse ürünün yorum özeti tazelenir (kart yıldızı buradan okur).
    if (data?.product_id) await recalcProductReviewStats(supabase, data.product_id)

    return NextResponse.json({ success: true })
  }

  const { error } = await supabase.from('campaigns').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const type = new URL(request.url).searchParams.get('type')
  const supabase = createServiceClient()

  if (type === 'review') {
    // Faz 11D: fotoğraflı yorum silinirken depo dosyası da temizlenir —
    // reddedilen (uygunsuz) görsel herkese açık kovada kalmasın. Kolon
    // henüz yoksa kolonsuz seçime düşülür.
    let { data: existing } = await supabase
      .from('reviews')
      .select('product_id, photo_url')
      .eq('id', id)
      .maybeSingle()
    if (!existing) {
      ;({ data: existing } = await supabase
        .from('reviews')
        .select('product_id')
        .eq('id', id)
        .maybeSingle())
    }

    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const foto = (existing as { photo_url?: string | null } | null)?.photo_url
    if (foto) {
      const yol = foto.split('/storage/v1/object/public/media/')[1]
      if (yol?.startsWith('yorumlar/')) {
        const { error: depoHata } = await supabase.storage.from('media').remove([yol])
        if (depoHata) console.error('[yorum-sil] foto silinemedi:', depoHata.message)
      }
    }

    if (existing?.product_id) await recalcProductReviewStats(supabase, existing.product_id)
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
