'use client'

import { formatPrice } from '@/lib/utils'
import { kampanyaEtiketi } from '@/lib/campaignLabel'
import { useVitrinIndirimi } from './KampanyaContext'

/**
 * Ürün sayfasının fiyat bloğu — tarayıcıda çizilir (14 Kas 2026).
 *
 * Ürün sayfası artık önbellekten veriliyor (en fazla 1 saat). Fiyat sunucuda
 * basılsaydı kampanya bittiği anda sayfa bir saate kadar eski indirimi
 * gösterebilir, sepet ise doğru fiyatı gösterirdi. Kampanya bilgisi sepet
 * paneli ve kartlarla AYNI kaynaktan (KampanyaSaglayici) gelir; sağlayıcı
 * bitiş anında indirimi kendiliğinden düşürür. Hesap ve görünüm, önceki
 * sunucu sürümüyle birebir aynıdır. Ödemede fiyat yine sunucuda hesaplanır.
 */
export default function UrunFiyati({
  listeFiyati,
  ustCiziliFiyat,
}: {
  listeFiyati: number
  /** Panelde elle indirilmiş fiyatta üstü çizili gösterilecek eski fiyat. */
  ustCiziliFiyat: number | null
}) {
  const vitrinIndirimi = useVitrinIndirimi()
  const kampanyaliFiyat =
    vitrinIndirimi?.fiyatGoster && vitrinIndirimi.oran
      ? Math.round(listeFiyati * (1 - vitrinIndirimi.oran / 100) * 100) / 100
      : null

  return (
    // 24 Kas 2026 tasarım denetimi: fiyat MÜREKKEP renginde (altın yazı beyaz
    // zeminde zayıf okunuyordu; altın yalnız indirim rozetinde kalır). Alt
    // satır "sepette … kazanıyorsunuz" diyordu — indirim sepette ayrıca
    // düşecekmiş gibi okunuyordu; oysa yazan fiyata zaten yansımış durumda.
    <div className="mt-4 lg:mt-6 lg:border-t lg:border-line lg:pt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {kampanyaliFiyat != null ? (
          <>
            <p className="price text-[28px] leading-none text-ink">{formatPrice(kampanyaliFiyat)}</p>
            <p className="price text-[16px] font-normal text-muted line-through">{formatPrice(listeFiyati)}</p>
            <span className="rounded-[3px] bg-accent/10 px-2 py-1 font-body text-[12px] font-medium text-accent-deep">
              %{vitrinIndirimi!.oran} indirim
            </span>
          </>
        ) : (
          <>
            <p className="price text-[28px] leading-none text-ink">{formatPrice(listeFiyati)}</p>
            {ustCiziliFiyat != null && (
              <p className="price text-[16px] text-muted line-through font-normal">{formatPrice(ustCiziliFiyat)}</p>
            )}
          </>
        )}
        <span className="font-body text-[12px] text-muted">KDV dahil</span>
      </div>
      {kampanyaliFiyat != null && (
        <p className="mt-2 font-body text-[13px] text-ink-soft">
          {kampanyaEtiketi(vitrinIndirimi!.ad)} bu fiyata yansıtıldı:{' '}
          <span className="whitespace-nowrap">{formatPrice(listeFiyati - kampanyaliFiyat)} indirim</span>
        </p>
      )}
      {/* Koşullu kampanya: indirimli fiyat yerine koşul rozeti (Faz 17). */}
      {kampanyaliFiyat == null && vitrinIndirimi?.rozet && (
        <p className="mt-2 font-body text-[13px] text-accent-deep">
          {kampanyaEtiketi(vitrinIndirimi.ad)} — {vitrinIndirimi.rozet}
        </p>
      )}
    </div>
  )
}
