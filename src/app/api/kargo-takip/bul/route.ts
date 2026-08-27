import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'
import { siparisOzetiMaili } from '@/lib/emails/templates'
import { sendMail } from '@/lib/emails/send'
import { epostaMaskele } from '@/lib/uyeler/liste'

export const dynamic = 'force-dynamic'

/**
 * "Siparişlerimi bul" + "takip bağlantısını tekrar gönder" (Faz 11C).
 *
 * GERÇEK OLAY: onay/kargo maili müşteriye ulaşmayınca sipariş numarası da
 * elinde olmuyor; takip sayfası numara + e-posta istediği için müşteri
 * kilitleniyor. Bu uç iki modu da tek kapıdan çözer:
 *   - { eposta }    → o adrese kayıtlı siparişlerin özeti maillenir
 *   - { siparisNo } → o siparişin KAYITLI adresine takip maili gönderilir
 *
 * SIZINTI YOK: yanıt her iki modda ve her durumda AYNI genel mesajdır —
 * adresin/numaranın sistemde olup olmadığı dışarı sızmaz; bilgi yalnız
 * kayıtlı adresin gelen kutusuna gider. Yanıt süresi de dallanmaz: mail
 * gönderimi beklenmez (waitUntil değil ama await'siz fire-and-log), böylece
 * "var/yok" zamanlamadan da okunamaz.
 */
export async function POST(request: Request) {
  // Sıkı sınır: mail üreten uç (adres başına spam'e dönmesin diye istek
  // kimliği + girilen değerle birlikte sınırlanır).
  const govde = await request.json().catch(() => null)
  const eposta = String(govde?.eposta ?? '').trim().toLowerCase()
  const siparisNo = String(govde?.siparisNo ?? '').trim().toUpperCase()
  const anahtar = eposta || siparisNo || 'bos'

  const sinir = await hizSiniri(`siparis-bul:${istekKimligi(request, anahtar)}`, 3, 900)
  if (!sinir.gecer) return cokFazlaIstek(sinir.bekleSaniye)

  const genelYanit = NextResponse.json({
    ok: true,
    mesaj: 'Kayıtlı bir adres varsa sipariş bilgileri o adrese gönderildi.',
  })

  const gecerliEposta = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)
  const gecerliNo = /^NBS-\d{6,}$/.test(siparisNo)
  if (!gecerliEposta && !gecerliNo) return genelYanit

  // Yanıtı geciktirmemek ve zamanlama sızıntısı yaratmamak için iş arkada.
  void (async () => {
    try {
      const supabase = createServiceClient()
      let hedefEposta = eposta
      const sorgu = supabase
        .from('orders')
        .select('order_number, status, created_at, tracking_number, guest_email')
        .order('created_at', { ascending: false })
        .limit(10)

      if (gecerliNo) {
        const { data } = await sorgu.eq('order_number', siparisNo)
        if (!data?.length) return
        hedefEposta = String(data[0].guest_email ?? '').toLowerCase()
        if (!hedefEposta) return
        await gonder(hedefEposta, data)
        return
      }

      const { data } = await sorgu.eq('guest_email', hedefEposta)
      if (!data?.length) return
      await gonder(hedefEposta, data)
    } catch (e: unknown) {
      console.error('[siparis-bul] hata:', e instanceof Error ? e.message : e)
    }
  })()

  return genelYanit
}

async function gonder(
  eposta: string,
  siparisler: { order_number: string; status: string; created_at: string; tracking_number?: string | null }[]
) {
  const { subject, html } = siparisOzetiMaili(
    siparisler.map((o) => ({
      order_number: o.order_number,
      status: String(o.status),
      created_at: o.created_at,
      tracking_code: o.tracking_number ?? null,
    }))
  )
  const sonuc = await sendMail({ to: eposta, subject, html, label: 'Order lookup' })
  console.log(
    `[siparis-bul] ${sonuc.error ? 'HATA: ' + sonuc.error : 'gönderildi'} · alıcı=${epostaMaskele(eposta)} · ${siparisler.length} sipariş`
  )
}
