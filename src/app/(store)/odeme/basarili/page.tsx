'use client'

import Link from 'next/link'
import { dugmeSinifi } from '@/components/ui/Button'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle } from 'lucide-react'

function BasariliContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-accent-deep" />
      </div>
      <h1 className="font-heading text-[32px] text-ink mb-3">
        Siparişiniz Alındı
      </h1>
      {orderNumber && (
        <p className="text-[15px] font-body text-ink-soft mb-2">
          Sipariş Numarası:{' '}
          <span className="text-accent-deep font-medium">{orderNumber}</span>
        </p>
      )}
      <p className="text-[14px] font-body text-ink-soft mb-8 leading-relaxed">
        Siparişiniz oluşturuldu. Onay e-postası kısa süre içinde gönderilir.
        Teşekkür ederiz.
      </p>
      <Link
        prefetch={false}
        href="/urunler"
        className={dugmeSinifi('outline', 'md')}
      >
        Alışverişe devam
      </Link>
    </div>
  )
}

export default function BasariliPage() {
  return (
    <Suspense>
      <BasariliContent />
    </Suspense>
  )
}
