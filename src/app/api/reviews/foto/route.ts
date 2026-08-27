import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * Yorum fotoğrafı yükleme (Faz 11D).
 *
 * HERKESE AÇIK bir yükleme ucu — o yüzden sınırlar sıkı:
 *  · hız sınırı 5/saat (yorum ucununkiyle aynı kimlikte)
 *  · ham dosya en çok 6 MB; tip beyanına GÜVENİLMEZ — sharp gerçekten
 *    görüntü olarak çözemezse 400
 *  · sunucuda yeniden kodlanır: EXIF döndürme, en uzun kenar ≤1200px, webp;
 *    kalite 300 KB hedefine inene kadar düşürülür (vitrin görsel bütçesi)
 *  · rastgele adla media/yorumlar/ altına yazılır; yorum onaylanana kadar
 *    hiçbir sayfada gösterilmez, reddedilirse panel silme akışı dosyayı da
 *    temizler
 */
const MAX_HAM = 6 * 1024 * 1024
const HEDEF = 300 * 1024

export async function POST(request: Request) {
  const sinir = await hizSiniri(`yorum:${istekKimligi(request)}`, 5, 3600)
  if (!sinir.gecer) return cokFazlaIstek(sinir.bekleSaniye)

  let dosya: File | null = null
  try {
    const form = await request.formData()
    const f = form.get('foto')
    if (f instanceof File) dosya = f
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }
  if (!dosya) return NextResponse.json({ error: 'Fotoğraf gerekli' }, { status: 400 })
  if (dosya.size > MAX_HAM) {
    return NextResponse.json({ error: 'Fotoğraf en fazla 6 MB olabilir' }, { status: 400 })
  }

  try {
    const { default: sharp } = await import('sharp')
    const ham = Buffer.from(await dosya.arrayBuffer())

    let kalite = 80
    let cikti: Buffer
    do {
      cikti = await sharp(ham)
        .rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: kalite })
        .toBuffer()
      kalite -= 10
    } while (cikti.length > HEDEF && kalite >= 40)

    const ad = `yorumlar/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`
    const supabase = createServiceClient()
    const { error } = await supabase.storage
      .from('media')
      .upload(ad, cikti, { contentType: 'image/webp', upsert: false })
    if (error) {
      console.error('[yorum-foto] yükleme hatası:', error.message)
      return NextResponse.json({ error: 'Fotoğraf yüklenemedi' }, { status: 500 })
    }
    const { data } = supabase.storage.from('media').getPublicUrl(ad)
    return NextResponse.json({ url: data.publicUrl, boyutKB: Math.round(cikti.length / 1024) })
  } catch (e: unknown) {
    // sharp çözemedi = görüntü değil (tip beyanı ne derse desin)
    console.error('[yorum-foto] işleme hatası:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Dosya bir fotoğraf olarak okunamadı' }, { status: 400 })
  }
}
