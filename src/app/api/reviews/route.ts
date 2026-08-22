import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMail } from '@/lib/emails/send'
import { adminNewReviewEmail } from '@/lib/emails/templates'
import { bildirimAdresi } from '@/lib/emails/bildirim'

/**
 * Yorum kaydı. Herkes yazabilir ama hiçbir yorum doğrudan yayınlanmaz:
 * satır her zaman is_approved=false ile açılır, yayın admin onayına bağlıdır.
 * reviews tablosuna anon yazım RLS ile kapalı; kayıt yalnız buradan, service
 * role ile geçer.
 */
const RATE_LIMIT_PER_HOUR = 3
const MAX_BODY = 2000
const MAX_NAME = 80

// Basit in-route sayaç: tek sunucu örneği içinde IP başına saatlik sınır.
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const recent = (hits.get(ip) ?? []).filter((t) => t > hourAgo)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear() // kaba temizlik
  return recent.length > RATE_LIMIT_PER_HOUR
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return (forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim()
}

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  // Honeypot: gerçek kullanıcı bu alanı görmez, botlar doldurur.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ success: true })
  }

  const productId = String(body.productId ?? '').trim()
  const name = String(body.name ?? '').trim().slice(0, MAX_NAME)
  const email = String(body.email ?? '').trim().toLowerCase()
  const rating = Number(body.rating)
  const title = String(body.title ?? '').trim().slice(0, 120) || null
  const text = String(body.body ?? '').trim().slice(0, MAX_BODY)

  if (!productId || !name || !text) {
    return NextResponse.json({ error: 'Ad, puan ve yorum metni zorunludur' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Puan 1 ile 5 arasında olmalı' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 })
  }

  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: 'Çok fazla değerlendirme gönderdiniz, lütfen bir süre sonra tekrar deneyin' },
      { status: 429 }
    )
  }

  try {
    const supabase = createServiceClient()

    // Ürün gerçekten var mı?
    const { data: product } = await supabase
      .from('products')
      // Ad, yönetici bildirim mailinde kullanılıyor (Faz 15).
      .select('id, override_title, trendyol_title')
      .eq('id', productId)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Doğrulanmış alışveriş: aynı e-postayla teslim edilmiş/tamamlanmış sipariş
    // var mı? (orders tablosunda müşteri e-postası yalnız guest_email kolonunda.)
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['delivered', 'completed'])
      .ilike('guest_email', email)
      .limit(1)

    const isVerifiedPurchase = Boolean(orders && orders.length > 0)

    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      guest_name: name,
      guest_email: email,
      rating,
      title,
      body: text,
      is_approved: false, // moderasyon: kolon varsayılanı true, burada bilerek eziliyor
      is_verified_purchase: isVerifiedPurchase,
    })

    if (error) {
      console.error('Review insert error:', error.message)
      return NextResponse.json({ error: 'Değerlendirme kaydedilemedi' }, { status: 500 })
    }

    // Yeni yorum bildirimi: onay bekleyen yorumu görmek için panele bakmak
    // gerekiyordu (Faz 15).
    try {
      const alici = await bildirimAdresi()
      const bildirim = adminNewReviewEmail({
        urun: product?.override_title || product?.trendyol_title || 'Ürün',
        puan: rating,
        govde: String(text).slice(0, 400),
        yazar: name,
      })
      await sendMail({ to: alici, ...bildirim, label: 'Admin new review' })
    } catch (bildirimHata) {
      console.error('[reviews] yönetici bildirimi gönderilemedi:', bildirimHata)
    }

    return NextResponse.json({ success: true, verified: isVerifiedPurchase })
  } catch (error: any) {
    console.error('Review error:', error?.message)
    return NextResponse.json({ error: 'Değerlendirme kaydedilemedi' }, { status: 500 })
  }
}
