'use client'

/**
 * Footer'daki «Çerez tercihleri» bağlantısı (Faz 12).
 * Rıza bandını ayarlar görünümünde yeniden açar — KVKK gereği rıza her an
 * geri alınabilir olmalı. Tek satırlık istemci bileşeni; footer sunucu
 * bileşeni olarak kalır.
 */
export default function CerezTercihleriDugmesi() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('nb:consent-ac'))}
      className="inline-block py-2.5 -my-2.5 underline underline-offset-2 transition-colors hover:text-accent"
    >
      Çerez tercihleri
    </button>
  )
}
