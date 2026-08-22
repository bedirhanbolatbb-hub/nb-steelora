import { formatPrice } from '@/lib/utils'
import { WHATSAPP_URL } from '@/lib/contact'
import { SHIPPING_LINE_LABEL } from '@/lib/shipping'

/**
 * Müşteriye giden üç işlemsel mailin tek kaynağı.
 * Hem gerçek akışlar (ödeme callback'i, admin durum geçişi) hem de admin test
 * ucu bu şablonları kullanır — test edilen şey müşterinin aldığı şeydir.
 */
export const MAIL_FROM = 'NB Steelora <siparis@nbsteelora.com>'

const SITE = 'https://www.nbsteelora.com'

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2A1E1E;">
  <div style="text-align: center; padding: 30px 0; border-bottom: 1px solid #E8D8D0;">
    <h1 style="letter-spacing: 0.3em; font-size: 20px; font-weight: 400; margin: 0;">NB STEELORA</h1>
    <p style="font-size: 11px; color: #C89080; letter-spacing: 0.2em; margin: 5px 0 0;">FINE JEWELLERY</p>
  </div>
  <div style="padding: 40px 0;">
    <h2 style="font-size: 24px; font-weight: 300; margin-bottom: 8px;">${title}</h2>
    ${inner}
  </div>
  <div style="text-align: center; padding: 30px 0; border-top: 1px solid #E8D8D0; color: #A88070; font-size: 12px;">
    <p style="margin: 0 0 8px;">Sorularınız için <a href="mailto:info@nbsteelora.com" style="color: #C89080;">info@nbsteelora.com</a></p>
    <p style="margin: 0;"><a href="${WHATSAPP_URL}" style="color: #C89080;">WhatsApp ile yazın</a></p>
    <p style="margin: 8px 0 0; font-size: 11px;">© 2026 NB Steelora®</p>
  </div>
</body>
</html>`
}

function orderNumberBox(orderNumber: string): string {
  return `<div style="background: #FFF8F6; border: 1px solid #E8D8D0; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Sipariş Numarası</p>
      <p style="margin: 0; font-size: 16px; font-weight: 600;">${orderNumber}</p>
    </div>`
}

export type OrderLike = {
  order_number: string
  items?: any[] | null
  total?: number | null
  shipping_cost?: number | null
  shipping_address?: { full_name?: string; address?: string; city?: string } | null
}

export function orderConfirmationEmail(order: OrderLike) {
  const items = Array.isArray(order.items) ? order.items : []
  const lines = items
    .map((item: any) => {
      const line = (Number(item.price) || 0) * (Number(item.quantity) || 1)
      return `<div style="padding: 12px 0; border-bottom: 1px solid #F0E8E0;">
        <p style="margin: 0; font-size: 14px;">${item.name}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #7A5048;">${formatPrice(line)}</p>
      </div>`
    })
    .join('')

  const shipping = Number(order.shipping_cost ?? 0)

  return {
    subject: `Siparişiniz Alındı — ${order.order_number}`,
    html: shell(
      'Siparişiniz Alındı 🎁',
      `<p style="color: #7A5048; margin-bottom: 30px;">Siparişiniz için teşekkür ederiz. En kısa sürede kargoya vereceğiz.</p>
    ${orderNumberBox(order.order_number)}
    <h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin-bottom: 16px;">Sipariş Detayları</h3>
    ${lines}
    <div style="padding: 16px 0; border-top: 2px solid #E8D8D0; margin-top: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #7A5048;">Kargo</span>
        <span>${shipping === 0 ? SHIPPING_LINE_LABEL : formatPrice(shipping)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin-top: 12px;">
        <span>Toplam</span>
        <span>${formatPrice(order.total ?? 0)}</span>
      </div>
    </div>
    ${
      order.shipping_address
        ? `<div style="margin-top: 30px; padding: 20px; background: #FFF8F6; border: 1px solid #E8D8D0;">
      <h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin: 0 0 12px;">Teslimat Adresi</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.8;">
        ${order.shipping_address.full_name ?? ''}<br>
        ${order.shipping_address.address ?? ''}<br>
        ${order.shipping_address.city ?? ''}
      </p>
    </div>`
        : ''
    }`
    ),
  }
}

export function shippingNotificationEmail(order: OrderLike, trackingNumber: string) {
  return {
    subject: `Siparişiniz Kargoya Verildi — ${order.order_number}`,
    html: shell(
      'Siparişiniz Yolda! 🚚',
      `<p style="color: #7A5048; margin-bottom: 30px;">Siparişiniz kargoya verildi. Aşağıdaki takip numarasını kullanarak kargonuzu takip edebilirsiniz.</p>
    ${orderNumberBox(order.order_number)}
    <div style="background: #2A1E1E; padding: 20px; margin-bottom: 30px; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Kargo Takip Numarası</p>
      <p style="margin: 0; font-size: 24px; font-weight: 600; color: #FFF8F6; letter-spacing: 0.2em;">${trackingNumber}</p>
    </div>
    <p style="text-align: center; margin-bottom: 24px;">
      <a href="${SITE}/kargo-takip?kod=${encodeURIComponent(trackingNumber)}" style="display: inline-block; background: #C89080; color: #2A1E1E; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;">Kargomu takip et</a>
    </p>
    <p style="color: #7A5048; font-size: 14px; line-height: 1.8;">Bağlantıya tıklayarak siparişinizin güncel durumunu görebilirsiniz.</p>`
    ),
  }
}

export type ReviewInviteProduct = { slug: string; display_title: string; image?: string | null }

export function reviewInviteEmail(order: OrderLike, products: ReviewInviteProduct[]) {
  const rows = products
    .map(
      (product) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #F0E8E0;" width="64">
          ${product.image ? `<img src="${product.image}" width="56" height="56" alt="" style="display:block; width:56px; height:56px; object-fit:cover; border:1px solid #E8D8D0;">` : ''}
        </td>
        <td style="padding: 12px 12px; border-bottom: 1px solid #F0E8E0; font-size: 14px;">${product.display_title}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #F0E8E0; text-align: right;">
          <a href="${SITE}/urun/${product.slug}#yorum" style="color: #8C6D33; font-size: 12px; text-decoration: underline;">Değerlendir</a>
        </td>
      </tr>`
    )
    .join('')

  return {
    subject: `Siparişiniz Teslim Edildi — ${order.order_number}`,
    html: shell(
      'Siparişiniz Teslim Edildi',
      `<p style="color: #7A5048; margin-bottom: 30px;">Umarız beğenirsiniz. Deneyiminizi paylaşırsanız diğer müşterilerimize yardımcı olursunuz.</p>
    ${orderNumberBox(order.order_number)}
    ${
      rows
        ? `<h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin-bottom: 8px;">Ürünlerini Değerlendir</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">${rows}</table>`
        : ''
    }
    <p style="color: #A88070; font-size: 12px; line-height: 1.8;">Değerlendirmeler yayınlanmadan önce incelenir.</p>`
    ),
  }
}

/**
 * Hesap silme teyidi (Faz 14). Kullanıcıya neyin silindiğini ve neyin yasal
 * zorunlulukla anonim olarak kaldığını açıkça söyler — KVKK m.11 kapsamındaki
 * "işlemin sonucundan haberdar edilme" beklentisini karşılar.
 */
export function accountDeletedEmail(params: { anonimSiparis: number }) {
  const siparisSatiri =
    params.anonimSiparis > 0
      ? `<li style="margin-bottom: 6px;"><strong>${params.anonimSiparis} sipariş kaydı</strong> — kişisel bilgiler çıkarılarak anonim biçimde saklandı</li>`
      : `<li style="margin-bottom: 6px;">Saklanması gereken sipariş kaydınız bulunmuyordu</li>`

  return {
    subject: 'Hesabınız silindi — NB Steelora',
    html: shell(
      'Hesabınız silindi',
      `<p style="color: #7A5048; line-height: 1.8; margin-bottom: 24px;">
        Talebiniz üzerine NB Steelora hesabınız silindi. Bu e-postayı, işlemin tamamlandığını
        bilmeniz için gönderiyoruz.
      </p>

      <div style="background: #FFF8F6; border: 1px solid #E8D8D0; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Silinenler</p>
        <ul style="margin: 0; padding-left: 18px; color: #7A5048; line-height: 1.8; font-size: 14px;">
          <li style="margin-bottom: 6px;">Ad, e-posta, telefon ve giriş bilgileriniz</li>
          <li style="margin-bottom: 6px;">Kayıtlı adresleriniz ve fatura bilgileriniz</li>
          <li style="margin-bottom: 6px;">Favorileriniz ve çerez tercihi kaydınız</li>
          <li style="margin-bottom: 6px;">Yorumlarınızdaki yazar bilgisi (yorum metni anonim olarak kalır)</li>
        </ul>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #E8D8D0; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Yasal zorunlulukla kalanlar</p>
        <ul style="margin: 0; padding-left: 18px; color: #7A5048; line-height: 1.8; font-size: 14px;">
          ${siparisSatiri}
        </ul>
        <p style="margin: 12px 0 0; color: #A88070; font-size: 13px; line-height: 1.7;">
          Vergi Usul Kanunu ve Türk Ticaret Kanunu, satış kayıtlarının 10 yıl saklanmasını
          zorunlu kılar. Bu kayıtlarda sipariş numarası, ürünler, tutarlar ve tarih durur;
          adınız, e-postanız, telefonunuz ve adresiniz çıkarılmıştır — kayıt size geri
          bağlanamaz.
        </p>
      </div>

      <p style="color: #A88070; font-size: 13px; line-height: 1.8;">
        Bu işlemi siz yapmadıysanız lütfen hemen bizimle iletişime geçin.
        Dilediğiniz zaman yeniden üye olabilirsiniz.
      </p>

      <p style="text-align: center; margin: 32px 0 0;">
        <a href="${SITE}" style="display: inline-block; background: #2A1E1E; color: #FFF8F6; padding: 16px 40px; text-decoration: none; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;">
          Mağazaya dön
        </a>
      </p>`
    ),
  }
}

/** Panel bağlantısı — bildirim maillerinde tek tıkla ilgili ekrana gitmek için. */
const PANEL = `${SITE}/panel`

function satirlarHtml(items: any[] | null | undefined): string {
  const liste = Array.isArray(items) ? items : []
  if (liste.length === 0) return '<li>—</li>'
  return liste
    .map(
      (i) =>
        `<li style="margin-bottom:4px;">${i?.quantity ?? 1} × ${i?.name ?? 'Ürün'} — ${formatPrice(
          Number(i?.price) || 0
        )}</li>`
    )
    .join('')
}

/**
 * Müşteriye: siparişiniz iptal edildi / iadeniz işlendi (Faz 15).
 * İptal akışında hiç mail gitmiyordu; müşteri parasının iade edildiğini
 * yalnız ekranda görüyordu.
 */
export function orderCancelledEmail(order: OrderLike & { total?: number | null }, iadeEdildi: boolean) {
  return {
    subject: `Siparişiniz İptal Edildi — ${order.order_number}`,
    html: shell(
      'Siparişiniz iptal edildi',
      `${orderNumberBox(order.order_number)}
      <p style="color:#7A5048;line-height:1.8;margin-bottom:20px;">
        ${order.order_number} numaralı siparişiniz iptal edildi.
        ${
          iadeEdildi
            ? `Ödemeniz (<strong>${formatPrice(Number(order.total) || 0)}</strong>) bankanıza iade edildi.
               Kartınıza yansıması bankanıza göre <strong>1–7 iş günü</strong> sürebilir.`
            : 'Tahsilat yapılmadığı için iade işlemi gerekmedi.'
        }
      </p>
      <p style="color:#A88070;font-size:13px;line-height:1.8;">
        Sorunuz olursa bu e-postayı yanıtlayabilir ya da
        <a href="mailto:info@nbsteelora.com" style="color:#C89080;">info@nbsteelora.com</a>
        adresine yazabilirsiniz.
      </p>`
    ),
  }
}

/** Yöneticiye: yeni sipariş (Faz 15). */
export function adminNewOrderEmail(order: any) {
  const adres = order?.shipping_address ?? {}
  const musteri = adres.fullName || adres.full_name || order?.guest_email || 'Müşteri'
  return {
    subject: `🛒 Yeni sipariş — ${order.order_number} · ${formatPrice(Number(order.total) || 0)}`,
    html: shell(
      'Yeni sipariş',
      `${orderNumberBox(order.order_number)}
      <p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">
        <strong>${musteri}</strong> · ${order?.guest_email ?? '—'}<br>
        Tutar: <strong>${formatPrice(Number(order.total) || 0)}</strong>
        ${Number(order?.discount_amount) > 0 ? ` (indirim ${formatPrice(Number(order.discount_amount))})` : ''}
      </p>
      <ul style="color:#7A5048;line-height:1.7;font-size:14px;padding-left:18px;margin:0 0 16px;">
        ${satirlarHtml(order?.items)}
      </ul>
      ${
        order?.gift_note
          ? `<div style="background:#FFF8E6;border:1px solid #E8D8A0;padding:14px;margin-bottom:16px;">
               <p style="margin:0 0 4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#A88070;">Sipariş notu</p>
               <p style="margin:0;color:#2A1E1E;">${order.gift_note}</p>
             </div>`
          : ''
      }
      <p style="text-align:center;margin:24px 0 0;">
        <a href="${PANEL}/siparisler" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">Panelde aç</a>
      </p>`
    ),
  }
}

/** Yöneticiye: iptal/iade talebi (Faz 15). */
export function adminOrderRequestEmail(order: any, tur: 'cancel' | 'return', mesaj?: string | null) {
  const baslik = tur === 'cancel' ? 'İptal talebi' : 'İade talebi'
  return {
    subject: `⚠️ ${baslik} — ${order.order_number}`,
    html: shell(
      baslik,
      `${orderNumberBox(order.order_number)}
      <p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">
        Müşteri <strong>${baslik.toLowerCase()}</strong> oluşturdu.
        Tutar: <strong>${formatPrice(Number(order.total) || 0)}</strong>
      </p>
      ${mesaj ? `<p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">Müşteri mesajı: ${mesaj}</p>` : ''}
      <p style="color:#A88070;font-size:13px;line-height:1.7;">
        Onayladığınızda ödeme iyzico üzerinden iade edilir ve stok geri eklenir.
      </p>
      <p style="text-align:center;margin:24px 0 0;">
        <a href="${PANEL}/siparisler" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">Talebi incele</a>
      </p>`
    ),
  }
}

/** Yöneticiye: yeni yorum (Faz 15). */
export function adminNewReviewEmail(params: { urun: string; puan: number; govde: string; yazar?: string | null }) {
  return {
    subject: `⭐ Yeni yorum (${params.puan}/5) — ${params.urun}`,
    html: shell(
      'Yeni ürün yorumu',
      `<p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">
        <strong>${params.urun}</strong> · ${params.puan}/5
        ${params.yazar ? ` · ${params.yazar}` : ''}
      </p>
      <div style="background:#FFF8F6;border:1px solid #E8D8D0;padding:16px;margin-bottom:16px;">
        <p style="margin:0;color:#2A1E1E;line-height:1.7;">${params.govde}</p>
      </div>
      <p style="color:#A88070;font-size:13px;">Yorum onaylanana kadar sitede görünmez.</p>
      <p style="text-align:center;margin:24px 0 0;">
        <a href="${PANEL}/yorumlar" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">Yorumları aç</a>
      </p>`
    ),
  }
}
