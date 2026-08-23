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
/**
 * İçeriğin ilk baytlarından gerçek görsel türünü doğrular.
 * JPEG: FF D8 FF · PNG: 89 50 4E 47 · WebP: "RIFF"…"WEBP"
 */
function gorselMi(b: Uint8Array, bildirilen: string): boolean {
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  const webp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  if (bildirilen === 'image/jpeg') return jpeg
  if (bildirilen === 'image/png') return png
  if (bildirilen === 'image/webp') return webp
  return false
}

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
  // Boyut kontrolü gövde okunmadan ÖNCE (Faz 27): eskiden dosya tamamen
  // belleğe alındıktan sonra bakılıyordu.
  if (dosya.size > MAX_BAYT) {
    return NextResponse.json({ error: 'Dosya 10 MB sınırını aşıyor' }, { status: 400 })
  }

  // Faz 27: tür YALNIZ istemcinin bildirdiği MIME'a göre belirleniyordu.
  // İçeriğin ilk baytları gerçek türü söyler; uyuşmuyorsa reddedilir.
  const ilkBaytlar = new Uint8Array(await dosya.slice(0, 12).arrayBuffer())
  if (!gorselMi(ilkBaytlar, dosya.type)) {
    return NextResponse.json({ error: 'Dosya içeriği görsel değil' }, { status: 400 })
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
