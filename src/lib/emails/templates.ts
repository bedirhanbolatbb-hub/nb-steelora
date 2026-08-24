import { formatPrice } from '@/lib/utils'
import { htmlKacir } from '@/lib/guvenlik/girdi'
import { WHATSAPP_URL } from '@/lib/contact'
import { SHIPPING_LINE_LABEL } from '@/lib/shipping'
import { CAYMA_SURESI_GUN } from '@/lib/legal/sozlesme'
import { ORG_EMAIL } from '@/lib/seo'
import { subeIfadesi } from '@/lib/shipping/firmalar'

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
  /** Sözleşme onayı damgası burada taşınır (Faz 19). */
  metadata?: { sozlesme_onayi?: { surum?: string; onaylandiginda?: string } | null } | null
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
    }
    ${onBilgilendirmeOzeti(order)}`
    ),
  }
}

/**
 * Ön bilgilendirme özeti — sipariş onay e-postasına eklenir (Faz 19).
 *
 * Mesafeli Sözleşmeler Yönetmeliği, ön bilgilendirmenin tüketiciye KALICI VERİ
 * SAKLAYICISI ile verilmesini istiyor: sitede bir sayfanın durması yetmez,
 * müşterinin elinde kalan bir kopya gerekir. Sipariş onay e-postası bu işlevi
 * görüyor. Onay damgası (sürüm + zaman) da burada yazılı ki müşteri neyi
 * onayladığını sonradan da görebilsin.
 */
function onBilgilendirmeOzeti(order: OrderLike): string {
  const onay = order.metadata?.sozlesme_onayi ?? null
  const onayRow = onay?.onaylandiginda
    ? `<p style="margin:10px 0 0;font-size:12px;color:#A88070;">
         Ön bilgilendirme formu ve mesafeli satış sözleşmesi
         ${new Date(onay.onaylandiginda).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' })}
         tarihinde onaylandı (sürüm ${onay.surum ?? '-'}).
       </p>`
    : ''

  return `<div style="margin-top: 30px; padding: 20px; background: #FFF8F6; border: 1px solid #E8D8D0;">
      <h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin: 0 0 12px;">Ön Bilgilendirme Özeti</h3>
      <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.8; color: #2A1E1E;">
        <strong>Cayma hakkı:</strong> Ürünü teslim aldığınız tarihten itibaren
        ${CAYMA_SURESI_GUN} gün içinde gerekçe göstermeden cayabilirsiniz. Cayma
        bildirimini Hesabım → Siparişlerim ekranından ya da ${ORG_EMAIL} adresine
        e-posta ile iletebilirsiniz. İade kargo bedeli tarafımıza aittir.
      </p>
      <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.8; color: #2A1E1E;">
        <strong>Geri ödeme:</strong> Cayma bildiriminiz ulaştıktan sonra en geç 14 gün
        içinde, ödemeyi yaptığınız yöntemle ve masrafsız olarak iade edilir.
      </p>
      <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.8; color: #2A1E1E;">
        <strong>İstisna:</strong> Kişiye özel hazırlanan ürünler ile hijyen gereği
        ambalajı açıldıktan sonra iadesi uygun olmayan ürünlerde (küpe, piercing)
        cayma hakkı, ambalaj açılmamış olmak kaydıyla geçerlidir.
      </p>
      <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.8; color: #2A1E1E;">
        <strong>Teslimat:</strong> Yasal azami süre 30 gündür. Kargo ücretsizdir.
        <strong>Fiyatlar</strong> KDV dahildir.
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.8; color: #2A1E1E;">
        <strong>Uyuşmazlık:</strong> Şikâyetlerinizi Tüketici Hakem Heyetine veya
        Tüketici Mahkemesine iletebilirsiniz.
      </p>
      <p style="margin: 12px 0 0;">
        <a href="${SITE}/on-bilgilendirme-formu" style="color:#7A5048;font-size:12px;">Ön bilgilendirme formunun tamamı</a>
        &nbsp;·&nbsp;
        <a href="${SITE}/mesafeli-satis-sozlesmesi" style="color:#7A5048;font-size:12px;">Mesafeli satış sözleşmesi</a>
      </p>
      ${onayRow}
    </div>`
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
          <a href="${SITE}/urun/${product.slug}#yorum" style="color: #836835; font-size: 12px; text-decoration: underline;">Değerlendir</a>
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
export function orderCancelledEmail(
  order: OrderLike & {
    total?: number | null
    payment_refunded_at?: string | null
    iyzico_payment_id?: string | null
  },
  iadeEdildiParam?: boolean
) {
  // Tahsilat/iade durumu SİPARİŞ KAYDINDAN türetilir; çağıranın gönderdiği
  // bayrak yalnız aynı istekte yapılan iadeyi eklemek için kullanılır. Böylece
  // "tahsilat yapılmadı" metni, parası çekilmiş bir siparişte asla çıkmaz.
  const iadeEdildi = Boolean(order.payment_refunded_at) || Boolean(iadeEdildiParam)
  const tahsilatVardi = Boolean(order.iyzico_payment_id) || iadeEdildi
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
            : tahsilatVardi
              ? `Ödemenizin (<strong>${formatPrice(Number(order.total) || 0)}</strong>) iadesi işleme alındı;
                 sonucu ayrıca bildireceğiz.`
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
  // Faz 27: müşteri metni HTML'e KAÇIRILARAK gömülür. `gift_note` ve
  // `guest_email` doğrudan gömülüyordu; müşterinin yazdığı bir metin
  // yöneticinin gelen kutusunda ham HTML olarak çalışabilirdi.
  const musteri = htmlKacir(adres.fullName || adres.full_name || order?.guest_email || 'Müşteri')
  return {
    subject: `🛒 Yeni sipariş — ${order.order_number} · ${formatPrice(Number(order.total) || 0)}`,
    html: shell(
      'Yeni sipariş',
      `${orderNumberBox(order.order_number)}
      <p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">
        <strong>${musteri}</strong> · ${htmlKacir(order?.guest_email ?? '—')}<br>
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
               <p style="margin:0;color:#2A1E1E;">${htmlKacir(order.gift_note)}</p>
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
      ${mesaj ? `<p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">Müşteri mesajı: ${htmlKacir(mesaj)}</p>` : ''}
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
    subject: `⭐ Yeni yorum (${params.puan}/5) — ${htmlKacir(params.urun)}`,
    html: shell(
      'Yeni ürün yorumu',
      `<p style="color:#7A5048;line-height:1.8;margin:0 0 12px;">
        <strong>${htmlKacir(params.urun)}</strong> · ${params.puan}/5
        ${params.yazar ? ` · ${htmlKacir(params.yazar)}` : ''}
      </p>
      <div style="background:#FFF8F6;border:1px solid #E8D8D0;padding:16px;margin-bottom:16px;">
        <p style="margin:0;color:#2A1E1E;line-height:1.7;">${htmlKacir(params.govde)}</p>
      </div>
      <p style="color:#A88070;font-size:13px;">Yorum onaylanana kadar sitede görünmez.</p>
      <p style="text-align:center;margin:24px 0 0;">
        <a href="${PANEL}/yorumlar" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">Yorumları aç</a>
      </p>`
    ),
  }
}

/**
 * İkinci sipariş kuponu (Faz 17) — teslimat sonrası kişiye özel, tek
 * kullanımlık kod. Değerlendirme davetinden AYRI gönderilir: kupon içeren
 * ileti ticari nitelik taşır ve kendi abonelik satırını gerektirir.
 */
export function secondOrderCouponEmail(params: {
  orderNumber: string
  kod: string
  oran: number
  sonKullanim: Date
}) {
  const tarih = params.sonKullanim.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  })

  return {
    subject: `Bir sonraki seçiminiz için %${params.oran} — NB Steelora`,
    html: shell(
      'Size özel bir teşekkür',
      `<p style="color:#7A5048;line-height:1.8;margin:0 0 20px;">
        ${params.orderNumber} numaralı siparişiniz elinize ulaştı. Umarız seçtiğiniz parça
        sizi memnun etmiştir. Bize ikinci kez güvenmenizi çok isteriz — bu yüzden yalnızca
        size ait, tek kullanımlık bir indirim kodu ayırdık.
      </p>

      <div style="background:#2A1E1E;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C89080;">
          Kişiye özel indirim kodunuz
        </p>
        <p style="margin:0;font-size:24px;letter-spacing:.18em;color:#FFF8F6;font-weight:600;">
          ${params.kod}
        </p>
        <p style="margin:8px 0 0;font-size:18px;color:#FFF8F6;">%${params.oran}</p>
      </div>

      <p style="color:#7A5048;line-height:1.8;margin:0 0 8px;">
        Kodu ödeme adımındaki <strong>"İndirim Kodu"</strong> alanına yazmanız yeterli.
      </p>
      <ul style="color:#A88070;font-size:13px;line-height:1.8;padding-left:18px;margin:0 0 24px;">
        <li>Yalnızca bu e-postanın gönderildiği adrese tanımlıdır.</li>
        <li>Bir kez kullanılabilir.</li>
        <li><strong>${tarih}</strong> tarihine kadar geçerlidir.</li>
        <li>
          Diğer kampanyalarla birleştirilemez. Sepetinizde daha yüksek bir indirim varsa o
          uygulanır — kodunuz harcanmadan sizde kalır.
        </li>
      </ul>

      <p style="text-align:center;margin:0;">
        <a href="${SITE}/urunler" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:16px 40px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">
          Koleksiyonu keşfet
        </a>
      </p>`
    ),
  }
}

/**
 * Yöneticiye: kritik hata uyarısı (Faz 19).
 * Aynı uyarı için saatte bir gönderilir; bastırılan tekrar sayısı yazılır.
 */
export function kritikUyariEmail(params: {
  baslik: string
  mesaj: string
  tip: string
  bastirilan: number
  ilkGorulme: string | null
  detay: Record<string, unknown> | null
}) {
  const tr = (d: string) =>
    new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' })

  const detaySatirlari = params.detay
    ? Object.entries(params.detay)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#A88070;font-size:12px;">${k}</td>
             <td style="padding:4px 0;color:#2A1E1E;font-size:12px;font-family:monospace;">${String(v).slice(0, 300)}</td></tr>`
        )
        .join('')
    : ''

  return {
    subject: `🚨 ${params.baslik} — NB Steelora`,
    html: shell(
      params.baslik,
      `<div style="background:#FEF2F2;border:1px solid #FECACA;padding:16px;margin-bottom:16px;">
        <p style="margin:0;color:#991B1B;font-size:13px;line-height:1.7;font-family:monospace;">${params.mesaj.slice(0, 800)}</p>
      </div>
      ${
        params.bastirilan > 0
          ? `<p style="color:#7A5048;font-size:13px;margin:0 0 12px;">
               Bu hata son bir saatte <strong>${params.bastirilan} kez daha</strong> tekrarlandı
               ${params.ilkGorulme ? `(ilk görülme ${tr(params.ilkGorulme)})` : ''}.
             </p>`
          : ''
      }
      ${detaySatirlari ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${detaySatirlari}</table>` : ''}
      <p style="color:#A88070;font-size:12px;line-height:1.7;">
        Uyarı tipi: <code>${params.tip}</code>. Aynı hata için saatte en fazla bir uyarı
        gönderilir. Sağlık durumunu <a href="${SITE}/api/health" style="color:#7A5048;">/api/health</a>
        adresinden de görebilirsiniz.
      </p>
      <p style="text-align:center;margin:24px 0 0;">
        <a href="${PANEL}" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">Paneli aç</a>
      </p>`
    ),
  }
}

/** Yöneticiye: günlük sağlık raporu (Faz 19). */
export function saglikRaporuEmail(params: {
  gun: string
  ziyaretci: number
  oturum: number
  sayfaGoruntuleme: number
  sepeteEkleme: number
  odemeBaslatma: number
  siparis: number
  ciro: number
  syncDurum: string
  syncYasiSaat: number | null
  stokKuyrugu: { bekleyen: number; basarisiz: number }
  uyarilar: string[]
}) {
  const satir = (ad: string, deger: string | number) =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #F0E4DE;color:#7A5048;font-size:13px;">${ad}</td>
      <td style="padding:8px 0;border-bottom:1px solid #F0E4DE;color:#2A1E1E;font-size:13px;text-align:right;font-weight:600;">${deger}</td>
    </tr>`

  const sorunVar = params.uyarilar.length > 0

  return {
    subject: `${sorunVar ? '⚠️' : '✅'} Günlük rapor · ${params.gun} — NB Steelora`,
    html: shell(
      `Günlük Rapor · ${params.gun}`,
      `${
        sorunVar
          ? `<div style="background:#FEF2F2;border:1px solid #FECACA;padding:16px;margin-bottom:20px;">
               <p style="margin:0 0 8px;color:#991B1B;font-size:13px;font-weight:600;">Dikkat gerektiren ${params.uyarilar.length} konu:</p>
               <ul style="margin:0;padding-left:18px;color:#991B1B;font-size:13px;line-height:1.8;">
                 ${params.uyarilar.map((u) => `<li>${u}</li>`).join('')}
               </ul>
             </div>`
          : `<div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:14px;margin-bottom:20px;">
               <p style="margin:0;color:#166534;font-size:13px;">Her şey yolunda — dikkat gerektiren bir durum yok.</p>
             </div>`
      }
      <table style="width:100%;border-collapse:collapse;">
        ${satir('Ziyaretçi', params.ziyaretci)}
        ${satir('Oturum', params.oturum)}
        ${satir('Sayfa görüntüleme', params.sayfaGoruntuleme)}
        ${satir('Sepete ekleme', params.sepeteEkleme)}
        ${satir('Ödeme başlatma', params.odemeBaslatma)}
        ${satir('Sipariş', params.siparis)}
        ${satir('Ciro', formatPrice(params.ciro))}
        ${satir('Senkron', `${params.syncDurum}${params.syncYasiSaat != null ? ` · ${params.syncYasiSaat} sa önce` : ''}`)}
        ${satir('Stok kuyruğu', `${params.stokKuyrugu.bekleyen} bekleyen · ${params.stokKuyrugu.basarisiz} başarısız`)}
      </table>
      <p style="text-align:center;margin:28px 0 0;">
        <a href="${PANEL}/analiz" style="display:inline-block;background:#2A1E1E;color:#FFF8F6;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.15em;text-transform:uppercase;">Analizi aç</a>
      </p>`
    ),
  }
}

/**
 * Müşteriye: iade/iptal talebi alındı teyidi (Faz 20).
 *
 * Mesafeli Sözleşmeler Yönetmeliği m.11/2 son cümle: internet sitesi üzerinden
 * cayma hakkı sunuluyorsa, talebin ulaştığına ilişkin teyit bilgisinin
 * tüketiciye DERHÂL iletilmesi ZORUNLUDUR. Bu mail o yükümlülüğü karşılıyor —
 * önceden talep anında müşteriye hiçbir şey gitmiyordu.
 */
export function talepTeyidiEmail(params: {
  orderNumber: string
  tip: 'return' | 'cancel'
  gonderimGunu: number
}) {
  const iade = params.tip === 'return'
  return {
    subject: `${iade ? 'İade' : 'İptal'} talebinizi aldık — ${params.orderNumber}`,
    html: shell(
      `${iade ? 'İade' : 'İptal'} Talebiniz Alındı`,
      `${orderNumberBox(params.orderNumber)}
      <p style="color:#7A5048;line-height:1.8;margin:0 0 16px;">
        ${iade ? 'İade' : 'İptal'} talebiniz bize ulaştı. Talebinizi en kısa sürede
        inceleyip sonucunu size bildireceğiz.
      </p>
      ${
        iade
          ? `<div style="background:#FFF8F6;border:1px solid #E8D8D0;padding:16px;margin-bottom:16px;">
               <p style="margin:0 0 8px;color:#2A1E1E;font-size:14px;"><strong>Sırada ne var?</strong></p>
               <p style="margin:0;color:#7A5048;font-size:13px;line-height:1.8;">
                 Talebinizi onayladığımızda size <strong>iade kargo kodunu</strong> ve
                 ürünü hangi kargo şubesine bırakacağınızı ayrı bir e-postayla
                 göndereceğiz. <strong>İade kargo ücreti bize aittir</strong> — sizden
                 hiçbir bedel talep edilmez.
               </p>
               <p style="margin:10px 0 0;color:#A88070;font-size:12px;">
                 Cayma bildiriminizi gönderdiğiniz tarihten itibaren
                 ${params.gonderimGunu} gün içinde ürünü kargoya vermeniz gerekir.
               </p>
             </div>`
          : ''
      }
      <p style="color:#A88070;font-size:12px;line-height:1.7;">
        Bu e-posta, talebinizin tarafımıza ulaştığının teyididir.
        Sorularınız için <a href="mailto:${ORG_EMAIL}" style="color:#7A5048;">${ORG_EMAIL}</a>.
      </p>`
    ),
  }
}

/**
 * Müşteriye: iade onaylandı, kargo kodu ve talimat (Faz 20).
 * Kod ve firma panelden elle girilir (Kargonomi API'sinde iade ucu yok).
 */
export function iadeTalimatiEmail(params: {
  orderNumber: string
  kargoFirmasi: string
  iadeKodu: string
  sonGun: Date
  adres: string[]
}) {
  const tarih = params.sonGun.toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    subject: `İade kodunuz hazır — ${params.orderNumber}`,
    html: shell(
      'İade Talebiniz Onaylandı',
      `${orderNumberBox(params.orderNumber)}
      <p style="color:#7A5048;line-height:1.8;margin:0 0 16px;">
        İade talebiniz onaylandı. Aşağıdaki kodu kullanarak ürünü ücretsiz olarak
        bize gönderebilirsiniz.
      </p>

      <div style="background:#2A1E1E;padding:20px;text-align:center;margin-bottom:20px;">
        <p style="margin:0 0 6px;color:#A88070;font-size:11px;letter-spacing:.15em;text-transform:uppercase;">İade Kargo Kodu</p>
        <p style="margin:0;color:#FFF8F6;font-size:22px;letter-spacing:.1em;font-family:monospace;">${params.iadeKodu}</p>
        <p style="margin:8px 0 0;color:#A88070;font-size:13px;">${params.kargoFirmasi}</p>
      </div>

      <div style="background:#FFF8F6;border:1px solid #E8D8D0;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 10px;color:#2A1E1E;font-size:14px;"><strong>Nasıl gönderirsiniz?</strong></p>
        <ol style="margin:0;padding-left:18px;color:#7A5048;font-size:13px;line-height:1.9;">
          <li>Ürünü, varsa kutusu ve koruyucu ambalajıyla birlikte paketleyin.</li>
          <li>Takının çizilmemesi için yumuşak bir bezle sarın; kutuyu boşluk kalmayacak şekilde doldurun.</li>
          <li>Paketin üzerine <strong>${params.iadeKodu}</strong> kodunu, adınızı ve telefonunuzu yazın.</li>
          <li>En yakın <strong>${subeIfadesi(params.kargoFirmasi)}</strong> bırakın ve kodu görevliye belirtin.</li>
        </ol>
        <p style="margin:12px 0 0;color:#A88070;font-size:12px;">
          <strong>Ücret ödemeyin.</strong> İade kargo bedeli bize aittir; şubede sizden ücret istenirse
          bizimle iletişime geçin.
        </p>
      </div>

      <p style="color:#7A5048;font-size:13px;line-height:1.8;margin:0 0 16px;">
        Ürünü <strong>${tarih}</strong> tarihine kadar kargoya vermeniz gerekiyor.
        Paket bize ulaştığında inceleyip ödemenizi iade edeceğiz ve size ayrıca
        bilgi vereceğiz.
      </p>

      ${
        params.adres.length > 0
          ? `<div style="border-top:1px solid #F0E4DE;padding-top:14px;">
               <p style="margin:0 0 6px;color:#A88070;font-size:11px;letter-spacing:.1em;text-transform:uppercase;">İade Adresi</p>
               <p style="margin:0;color:#2A1E1E;font-size:13px;line-height:1.7;">${params.adres.join('<br>')}</p>
             </div>`
          : ''
      }`
    ),
  }
}

/** Müşteriye: ürün ulaştı, para iade edildi (Faz 20). */
export function iadeTamamlandiEmail(params: {
  orderNumber: string
  tutar: number | null
  geriOdemeGun: number
}) {
  return {
    subject: `İadeniz tamamlandı — ${params.orderNumber}`,
    html: shell(
      'İadeniz Tamamlandı',
      `${orderNumberBox(params.orderNumber)}
      <p style="color:#7A5048;line-height:1.8;margin:0 0 16px;">
        İade ettiğiniz ürün bize ulaştı ve ödemeniz
        ${params.tutar != null ? `<strong>${formatPrice(params.tutar)}</strong> ` : ''}
        iade edildi.
      </p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:16px;margin-bottom:16px;">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.8;">
          Kredi kartıyla ödeme yaptıysanız bankanız, bize ulaşan tutarı kullanılabilir
          limitinize <strong>tek seferde</strong> eklemekle yükümlüdür. Kartınıza
          yansıması bankanıza bağlı olarak <strong>3–7 iş günü</strong> sürebilir; bu süre
          bizim kontrolümüzde değildir.
        </p>
      </div>
      <p style="color:#A88070;font-size:12px;line-height:1.7;">
        Bir sorun olduğunu düşünüyorsanız
        <a href="mailto:${ORG_EMAIL}" style="color:#7A5048;">${ORG_EMAIL}</a> adresinden
        bize yazın. Tekrar görüşmek dileğiyle.
      </p>`
    ),
  }
}

/**
 * Kalem iptali — tedarik edilemeyen ürünün bedeli iade edildi (Faz 30).
 *
 * Ton: özür dileyen ama telaşsız. Müşteri iki şeyi net bilmeli — hangi ürün
 * çıkarıldı ve parası ne zaman hesabına döner.
 */
export function kalemIptalEmail(
  order: OrderLike & { total?: number | null },
  kalem: { ad: string; adet: number; iadeTutari: number; sebep?: string | null }
) {
  return {
    subject: `Siparişinizde bir değişiklik — ${order.order_number}`,
    html: shell(
      'Bir ürün siparişinizden çıkarıldı',
      `<p style="color:#7A5048;line-height:1.8;margin:0 0 20px;">
        Siparişinizdeki <strong>${htmlKacir(kalem.ad)}</strong> ürününü tedarik edemedik.
        Bu ürünü siparişinizden çıkardık ve bedelini iade ettik. Kusurumuza bakmayın.
      </p>
      ${orderNumberBox(order.order_number)}
      <div style="background:#FFF8E6;border:1px solid #E8D8A0;padding:16px;margin:0 0 20px;">
        <p style="margin:0 0 6px;color:#2A1E1E;">
          <strong>Çıkarılan ürün:</strong> ${htmlKacir(kalem.ad)}${kalem.adet > 1 ? ` (${kalem.adet} adet)` : ''}
        </p>
        <p style="margin:0;color:#2A1E1E;">
          <strong>İade edilen tutar:</strong> ${formatPrice(kalem.iadeTutari)}
        </p>
      </div>
      ${
        kalem.sebep
          ? `<p style="color:#7A5048;font-size:14px;line-height:1.8;margin:0 0 20px;">${htmlKacir(kalem.sebep)}</p>`
          : ''
      }
      <p style="color:#7A5048;font-size:14px;line-height:1.8;margin:0 0 20px;">
        İade, kartınızı veren bankaya göre <strong>1-7 iş günü</strong> içinde hesabınıza yansır.
        Siparişinizin kalan ürünleri hazırlanmaya devam ediyor; kargoya verildiğinde ayrıca
        haber vereceğiz.
      </p>
      <p style="color:#7A5048;font-size:14px;line-height:1.8;margin:0;">
        Siparişinizin güncel tutarı: <strong>${formatPrice(Number(order.total) || 0)}</strong>
      </p>`
    ),
  }
}
