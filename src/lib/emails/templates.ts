import { formatPrice } from '@/lib/utils'

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
    <p style="margin: 0;"><a href="https://wa.me/905536552020" style="color: #C89080;">WhatsApp ile yazın</a></p>
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
        <span>${shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}</span>
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
    <p style="color: #7A5048; font-size: 14px; line-height: 1.8;">Kargo firmasının web sitesine giderek takip numaranızı girin.</p>`
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
