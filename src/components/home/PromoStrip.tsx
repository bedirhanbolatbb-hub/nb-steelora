/**
 * Promo şeridi v2 — Inter, emojisiz, ince altın çizgili.
 * (Eski hâli emojili metni Playfair'le basıyordu — Faz 8B'de düzeltildi.)
 * Kampanya verisi mevcut sorgudan gelir; davranış değişmedi.
 */
/** Gösterim katmanında emoji ayıklanır — kampanya adı veride olduğu gibi kalır. */
const emojisiz = (t: string) =>
  t
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

export default function PromoStrip({ campaign }: { campaign: any }) {
  if (!campaign) return null

  const ad = emojisiz(String(campaign.name || ''))
  const satir =
    campaign.type === 'discount_code' && campaign.code
      ? `${ad} — kod: ${campaign.code}`
      : campaign.type === 'buy_x_get_y' && campaign.metadata
        ? `${ad} — ${campaign.metadata.buy_quantity} al ${campaign.metadata.pay_quantity} öde`
        : emojisiz(String(campaign.banner_text || campaign.name || ''))

  if (!satir) return null

  return (
    <section className="border-y border-accent/30 bg-bg">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3.5 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center">
        <p className="font-body text-[12px] tracking-[0.14em] uppercase text-ink">{satir}</p>
        {campaign.ends_at && (
          <p className="font-body text-[10px] tracking-[0.08em] text-muted">
            {new Date(campaign.ends_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })} tarihine kadar
          </p>
        )}
      </div>
    </section>
  )
}
