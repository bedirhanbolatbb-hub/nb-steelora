'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { paylasimKodla } from '@/lib/sepet/paylasim'
import type { PaylasilanKalem } from '@/app/(store)/sepet/page'
import { kucukResim } from '@/lib/gorsel/kadraj'
import { useKadrajSorgu } from '@/components/store/KadrajContext'

/**
 * Sepeti paylaş düğmesi (Faz 35).
 *
 * Telefonda paylaşım menüsünü açar (WhatsApp, Mesajlar…); menü olmayan
 * tarayıcıda bağlantıyı panoya kopyalar.
 */
export function SepetiPaylasDugmesi() {
  const items = useCart((s) => s.items)
  const [kopyalandi, setKopyalandi] = useState(false)

  const paylas = async () => {
    const kod = paylasimKodla(items.map((i) => ({ id: i.product.id, adet: i.quantity })))
    const adres = `${window.location.origin}/sepet?paylas=${kod}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'NB Steelora sepetim', url: adres })
        return
      } catch (e) {
        // Kullanıcı menüyü kapattıysa sessiz kal; başka hata varsa kopyalamaya düş.
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(adres)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2500)
    } catch {
      window.prompt('Bağlantıyı kopyalayın:', adres)
    }
  }

  if (!items.length) return null
  return (
    <button
      type="button"
      onClick={paylas}
      className="inline-flex items-center gap-2 text-[12px] font-body text-ink-soft hover:text-accent-deep transition-colors"
    >
      {kopyalandi ? <Check size={14} /> : <Share2 size={14} />}
      {kopyalandi ? 'Bağlantı kopyalandı' : 'Sepeti paylaş'}
    </button>
  )
}

/**
 * Size paylaşılan sepet (Faz 35). Ürünler güncel fiyatıyla gösterilir;
 * tek düğmeyle açan kişinin kendi sepetine eklenir.
 */
export function PaylasilanSepet({ kalemler }: { kalemler: PaylasilanKalem[] }) {
  const router = useRouter()
  const addItem = useCart((s) => s.addItem)
  const kadrajMi = useKadrajSorgu()
  const kampanyaIndirimi = useVitrinIndirimi()
  const [eklendi, setEklendi] = useState(false)
  const eklenebilir = kalemler.filter((k) => !k.tukendi)

  if (!kalemler.length) return null

  const hepsiniEkle = () => {
    for (const k of eklenebilir) addItem(k.product, k.quantity)
    setEklendi(true)
    router.replace('/sepet', { scroll: false })
  }

  return (
    <section className="mb-10 rounded-[6px] border border-accent-line/60 bg-surface-muted/40 p-5">
      <p className="eyebrow">Paylaşılan sepet</p>
      <h2 className="font-heading text-[22px] text-ink mt-1">Size bir sepet gönderildi</h2>
      <ul className="mt-4 divide-y divide-line/60">
        {kalemler.map(({ product, quantity, tukendi }) => {
          const gorsel = product.display_images?.[0]
          const f = vitrinFiyati(
            (product as { override_price?: number | null }).override_price ?? product.display_price,
            kampanyaIndirimi
          )
          return (
            <li key={product.id} className="flex items-center gap-3 py-3">
              <Link
                href={`/urun/${product.slug}`}
                className="relative w-14 aspect-[4/5] shrink-0 overflow-hidden rounded-[4px] bg-surface-muted"
              >
                {gorsel && (
                  <Image
                    {...kucukResim(gorsel, 256, kadrajMi(product.id))}
                    alt={product.display_title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/urun/${product.slug}`}
                  className="font-heading text-[15px] text-ink hover:text-accent-deep transition-colors block truncate"
                >
                  {product.display_title}
                </Link>
                <p className="text-[12px] font-body text-muted mt-0.5">
                  {quantity} adet · {formatPrice(f.gosterilen)}
                  {tukendi && <span className="ml-2 text-red-700">Tükendi</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      {eklenebilir.length > 0 && !eklendi && (
        <button
          type="button"
          onClick={hepsiniEkle}
          className="mt-4 inline-block bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
        >
          Hepsini sepetime ekle
        </button>
      )}
    </section>
  )
}
