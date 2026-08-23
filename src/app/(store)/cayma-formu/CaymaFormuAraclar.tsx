'use client'

import { Printer, Mail } from 'lucide-react'

/**
 * Cayma formu için iki kısa yol: yazdır ve e-posta ile gönder.
 * Form doldurmak ZORUNLU DEĞİL (MSY m.11/2) — bu düğmeler yalnız kolaylık.
 */
export default function CaymaFormuAraclar({ eposta }: { eposta: string }) {
  const konu = encodeURIComponent('Cayma hakkı bildirimi')
  const govde = encodeURIComponent(
    [
      'Bu formla aşağıdaki ürünün satışına ilişkin sözleşmeden cayma hakkımı kullandığımı beyan ederim.',
      '',
      'Sipariş numarası:',
      'Sipariş tarihi veya teslim tarihi:',
      'Cayma hakkına konu ürün:',
      'Ürün bedeli:',
      'Adım ve soyadım:',
      'Adresim:',
      'Tarih:',
    ].join('\n')
  )

  return (
    <div className="not-prose my-6 flex flex-col gap-3 sm:flex-row">
      <a
        href={`mailto:${eposta}?subject=${konu}&body=${govde}`}
        className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-bg transition-colors hover:bg-accent-deep"
      >
        <Mail size={14} /> E-posta ile gönder
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:bg-ink hover:text-bg"
      >
        <Printer size={14} /> Yazdır
      </button>
    </div>
  )
}
