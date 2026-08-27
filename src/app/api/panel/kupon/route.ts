import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { kuponKoduUret } from '@/lib/kuponlar/ikinciSiparis'
import { kisiselKuponEmail } from '@/lib/emails/templates'
import { sendMail } from '@/lib/emails/send'
import { KUPON_VARSAYILAN } from '@/lib/metin/kuponMetni'

export const dynamic = 'force-dynamic'

/**
 * Panelden kişiye özel kupon üretimi ve yönetimi (Faz 11E).
 *
 * Altyapı zaten vardı (campaign_coupons: kişiye bağlı kod, kullanım sayısı,
 * son kullanma; sepetOzeti.ts sahiplik/süre/hak doğrulaması) — eksik olan
 * BB'nin bunu kullanabileceği kapıydı. Bu uç onu açar:
 *   POST            → tek ya da TOPLU üretim (+ isteğe bağlı mail)
 *   POST ?islem=mail → var olan kodu sahibine yeniden gönder
 *   PATCH           → iptal / yeniden etkinleştir
 *
 * KURAL: kupon ancak `requires_code` olan bir kampanyaya bağlanabilir —
 * kod gerektirmeyen kampanya zaten herkese otomatik uygulanıyor, ona kişisel
 * kod üretmek sessizce yanlış davranış olurdu.
 */
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const islem = new URL(request.url).searchParams.get('islem')
  const body = await request.json().catch(() => null)
  const supabase = createServiceClient()

  // ── Var olan kodu yeniden gönder ──
  if (islem === 'mail') {
    const kuponId = String(body?.kuponId ?? '').trim()
    if (!kuponId) return NextResponse.json({ error: 'Kupon gerekli' }, { status: 400 })
    const { data: kupon } = await supabase
      .from('campaign_coupons')
      .select('id, code, email, max_uses, expires_at, is_active, campaigns(name, discount_type, discount_value)')
      .eq('id', kuponId)
      .maybeSingle()
    if (!kupon) return NextResponse.json({ error: 'Kupon bulunamadı' }, { status: 404 })
    if (!kupon.email) return NextResponse.json({ error: 'Kuponun e-posta adresi yok' }, { status: 400 })
    if (!kupon.is_active) return NextResponse.json({ error: 'İptal edilmiş kupon gönderilemez' }, { status: 400 })

    const k = kupon.campaigns as unknown as { discount_type: string; discount_value: number } | null
    const mail = kisiselKuponEmail({
      baslik: String(body?.baslik ?? '').trim() || KUPON_VARSAYILAN.baslik,
      govde: String(body?.govde ?? '').trim() || KUPON_VARSAYILAN.govde,
      kod: kupon.code,
      oran: Number(k?.discount_value ?? 0),
      tip: (k?.discount_type ?? 'percent') === 'fixed' ? 'fixed' : 'percent',
      sonKullanim: kupon.expires_at ? new Date(kupon.expires_at) : null,
      kullanimHakki: Number(kupon.max_uses ?? 1),
    })
    const sonuc = await sendMail({ to: kupon.email, ...mail, label: 'Kupon (yeniden)' })
    if (sonuc.error) return NextResponse.json({ error: sonuc.error }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Üretim (tek ya da toplu) ──
  const campaignId = String(body?.campaignId ?? '').trim()
  const hamEpostalar: unknown = body?.emails
  const kullanimHakki = Math.min(20, Math.max(1, Number(body?.maxUses) || 1))
  const gecerlilikGun = Math.min(365, Math.max(0, Number(body?.gecerlilikGun) || 0))
  const mailAt = Boolean(body?.mailAt)
  const baslik = String(body?.baslik ?? '').trim() || KUPON_VARSAYILAN.baslik
  const govde = String(body?.govde ?? '').trim() || KUPON_VARSAYILAN.govde

  if (!campaignId) return NextResponse.json({ error: 'Kampanya seçin' }, { status: 400 })
  const liste = (Array.isArray(hamEpostalar) ? hamEpostalar : [])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean)
  const tekil = [...new Set(liste)]
  if (!tekil.length) return NextResponse.json({ error: 'En az bir e-posta girin' }, { status: 400 })
  if (tekil.length > 200) return NextResponse.json({ error: 'Tek seferde en fazla 200 adres' }, { status: 400 })
  const gecersiz = tekil.filter((e) => !EPOSTA.test(e))
  if (gecersiz.length) {
    return NextResponse.json(
      { error: `Geçersiz adres: ${gecersiz.slice(0, 3).join(', ')}${gecersiz.length > 3 ? '…' : ''}` },
      { status: 400 }
    )
  }

  const { data: kampanya } = await supabase
    .from('campaigns')
    .select('id, name, requires_code, discount_type, discount_value, is_active')
    .eq('id', campaignId)
    .maybeSingle()
  if (!kampanya) return NextResponse.json({ error: 'Kampanya bulunamadı' }, { status: 404 })
  if (!kampanya.requires_code) {
    return NextResponse.json(
      {
        error:
          'Bu kampanya kod gerektirmiyor — herkese otomatik uygulanıyor. Kişisel kod için kampanyada "Kod gerektirir" açık olmalı.',
      },
      { status: 400 }
    )
  }

  const bitis = gecerlilikGun > 0 ? new Date(Date.now() + gecerlilikGun * 86400000) : null
  const uretilen: { email: string; kod: string }[] = []
  const hatalar: { email: string; sebep: string }[] = []

  for (const eposta of tekil) {
    let kod = ''
    let yazildi = false
    // Kod çakışması olasılığı düşük; yine de üç deneme (ikinciSiparis deseni).
    for (let deneme = 0; deneme < 3; deneme++) {
      kod = kuponKoduUret()
      const { error } = await supabase.from('campaign_coupons').insert({
        campaign_id: campaignId,
        code: kod,
        email: eposta,
        max_uses: kullanimHakki,
        expires_at: bitis ? bitis.toISOString() : null,
        source: 'manual',
      })
      if (!error) {
        yazildi = true
        break
      }
      if (deneme === 2) hatalar.push({ email: eposta, sebep: error.message })
    }
    if (!yazildi) continue
    uretilen.push({ email: eposta, kod })

    if (mailAt) {
      const mail = kisiselKuponEmail({
        baslik,
        govde,
        kod,
        oran: Number(kampanya.discount_value ?? 0),
        tip: (kampanya.discount_type ?? 'percent') === 'fixed' ? 'fixed' : 'percent',
        sonKullanim: bitis,
        kullanimHakki,
      })
      const sonuc = await sendMail({ to: eposta, ...mail, label: 'Kupon (panel)' })
      if (sonuc.error) hatalar.push({ email: eposta, sebep: `mail: ${sonuc.error}` })
    }
  }

  return NextResponse.json({ ok: true, uretilen, hatalar })
}

/** İptal / yeniden etkinleştirme — kupon SİLİNMEZ, izi kalır. */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '').trim()
  const aktif = Boolean(body?.is_active)
  if (!id) return NextResponse.json({ error: 'Kupon gerekli' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('campaign_coupons').update({ is_active: aktif }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
