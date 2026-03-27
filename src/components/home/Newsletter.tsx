'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function Newsletter() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Newsletter subscription
    setEmail('')
  }

  return (
    <section className="bg-champagne">
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-[32px] text-text-primary mb-3">
          Yeni koleksiyonlardan ilk siz haberdar olun
        </h2>
        <p className="text-[12px] font-body text-text-muted mb-8">
          Özel kampanyalar, yeni ürünler ve daha fazlası için abone olun.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="E-posta adresiniz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" variant="primary" className="whitespace-nowrap">
            Abone Ol
          </Button>
        </form>
      </div>
    </section>
  )
}
