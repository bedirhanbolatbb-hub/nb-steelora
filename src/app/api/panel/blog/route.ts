import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

function slugla(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'yazi'
  )
}

/**
 * Blog yazısı oluştur/güncelle. Slug yalnız OLUŞTURMADA üretilir (benzersiz
 * hâle getirilir); güncellemede slug alanı yok sayılır — canlı URL değişmez.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : null
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const content = typeof body?.content === 'string' ? body.content : ''
  if (!title || !content.trim()) {
    return NextResponse.json({ error: 'Başlık ve içerik zorunlu' }, { status: 400 })
  }

  const coverImage = typeof body?.cover_image === 'string' ? body.cover_image.trim() || null : null
  if (coverImage) {
    try {
      const u = new URL(coverImage)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
    } catch {
      return NextResponse.json({ error: 'Geçersiz kapak görseli adresi' }, { status: 400 })
    }
  }

  const alanlar = {
    title,
    content,
    excerpt: typeof body?.excerpt === 'string' ? body.excerpt.trim() || null : null,
    cover_image: coverImage,
    read_time: Math.max(1, Math.min(60, Number(body?.read_time) || 4)),
    published: body?.published !== false,
    published_at: body?.published_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const supabase = createServiceClient()

  if (id) {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(alanlar)
      .eq('id', id)
      .select('id, slug')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Yazı bulunamadı' }, { status: 404 })
    return NextResponse.json({ ok: true, slug: data.slug })
  }

  // Yeni yazı: benzersiz slug üret.
  let slug = slugla(title)
  const { data: ayni } = await supabase.from('blog_posts').select('slug').ilike('slug', `${slug}%`)
  if (ayni?.some((r: any) => r.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({ ...alanlar, slug })
    .select('id, slug')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug })
}
