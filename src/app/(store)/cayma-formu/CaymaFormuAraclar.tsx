'use client'

import { Printer, Mail } from 'lucide-react'
import { dugmeSinifi } from '@/components/ui/Button'

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
        className={dugmeSinifi('primary', 'md', 'gap-2')}
      >
        <Mail size={14} /> E-posta ile gönder
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className={dugmeSinifi('outline', 'md', 'gap-2')}
      >
        <Printer size={14} /> Yazdır
      </button>
    </div>
  )
}
