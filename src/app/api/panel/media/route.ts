import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 30

const IZINLI = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_BAYT = 10 * 1024 * 1024

/**
 * Panel medya yüklemesi — Supabase Storage 'media' bucket'ına (public read),
 * yalnız admin guard'ı arkasında, service role ile. İstemci dosyayı zaten
 * ≤2400px'e küçültüp webp/jpeg olarak gönderir; burada tip + boyut doğrulanır,
 * benzersiz ad üretilir ve public URL dönülür.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  const dosya = form?.get('file')
  if (!(dosya instanceof File)) {
    return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 })
  }
  const uzanti = IZINLI.get(dosya.type)
  if (!uzanti) {
    return NextResponse.json({ error: 'Yalnız JPEG, PNG ya da WebP' }, { status: 400 })
  }
  if (dosya.size > MAX_BAYT) {
    return NextResponse.json({ error: 'Dosya 10 MB sınırını aşıyor' }, { status: 400 })
  }

  const ad = `${new Date().toISOString().slice(0, 10)}/${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${uzanti}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('media')
    .upload(ad, Buffer.from(await dosya.arrayBuffer()), {
      contentType: dosya.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('media').getPublicUrl(ad)
  return NextResponse.json({ ok: true, url: data.publicUrl, path: ad })
}

/** Test/temizlik: bucket'tan dosya silme (yalnız admin). */
export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { path } = await request.json().catch(() => ({}))
  if (typeof path !== 'string' || !path || path.includes('..')) {
    return NextResponse.json({ error: 'Geçersiz yol' }, { status: 400 })
  }
  const supabase = createServiceClient()
  const { error } = await supabase.storage.from('media').remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
