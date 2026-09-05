'use client'

import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'

/**
 * Kupon kutusu — sepet ve ödeme adımında AYNI bileşen (Faz 25).
 *
 * Önceden kupon yalnız ödeme adımındaydı ve iki ayrı uç iki farklı cümle
 * dönüyordu; üstelik kod kabul edilip kampanya sessizce uygulanmadığında
 * müşteriye hiçbir şey söylenmiyordu. Tek bileşen + tek mesaj sözlüğü
 * (lib/campaigns/kuponMesaji.ts) bunu kapatıyor.
 *
 * Kod `localStorage`'da tutulur: müşteri sepette girdiği kodu ödeme adımında
 * tekrar yazmak zorunda kalmasın.
 */

const ANAHTAR = 'nb_kupon'

/** Kodu sepet ve ödeme arasında taşıyan küçük durum. */
export function useKuponKodu(): [string, (kod: string) => void] {
  const [kod, setKodDurum] = useState('')

  useEffect(() => {
    try {
      const saklanan = window.localStorage.getItem(ANAHTAR)
      if (saklanan) setKodDurum(saklanan)
    } catch {
      // Gizli sekmede depolama kapalı olabilir; kod yalnız bu sayfada yaşar.
    }
  }, [])

  const setKod = (yeni: string) => {
    setKodDurum(yeni)
    try {
      if (yeni) window.localStorage.setItem(ANAHTAR, yeni)
      else window.localStorage.removeItem(ANAHTAR)
    } catch {
      /* yoksay */
    }
  }

  return [kod, setKod]
}

export default function KuponKutusu({
  kod,
  onKod,
  /** Sunucunun döndüğü mesaj — null ise hiçbir uyarı basılmaz. */
  mesaj,
  /** Kupon gerçekten uygulandıysa adı ve tutarı. */
  uygulanan,
  /** "Daha avantajlı kampanya var" bir hata değil; farklı tonda basılır. */
  bilgiTonu = false,
  baslik = 'İndirim Kodu',
}: {
  kod: string
  onKod: (kod: string) => void
  mesaj: string | null
  uygulanan: { ad: string; tutar: string } | null
  bilgiTonu?: boolean
  baslik?: string
}) {
  const [taslak, setTaslak] = useState(kod)
  useEffect(() => setTaslak(kod), [kod])

  const uygula = () => onKod(taslak.trim().toLocaleUpperCase('tr-TR'))
  const kaldir = () => {
    setTaslak('')
    onKod('')
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] font-body text-muted mb-3">{baslik}</p>
      <div className="flex gap-2">
        <Input
          placeholder="Kodu girin"
          value={taslak}
          onChange={(e) => setTaslak(e.target.value.toLocaleUpperCase('tr-TR'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              uygula()
            }
          }}
          className="flex-1"
          disabled={Boolean(kod)}
        />
        {kod ? (
          <button
            type="button"
            onClick={kaldir}
            className="shrink-0 rounded-[4px] border border-line px-4 py-2 font-body text-[11px] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Kaldır
          </button>
        ) : (
          <button
            type="button"
            onClick={uygula}
            disabled={!taslak.trim()}
            className="shrink-0 rounded-[4px] border border-ink px-4 py-2 font-body text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-40"
          >
            Uygula
          </button>
        )}
      </div>

      {uygulanan && (
        <p className="mt-2 font-body text-[11px] text-accent-deep">
          ✓ {uygulanan.ad} — {uygulanan.tutar} indirim
        </p>
      )}

      {/* Kod girildiyse ve uygulanmadıysa SEBEBİ yazılır — sessizlik yok. */}
      {mesaj && !uygulanan && (
        <p
          role="status"
          className={`mt-2 font-body text-[11px] leading-relaxed ${
            bilgiTonu ? 'text-ink-soft' : 'text-red-600'
          }`}
        >
          {mesaj}
        </p>
      )}
    </div>
  )
}
