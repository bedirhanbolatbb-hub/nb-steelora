'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import Input from '@/components/ui/Input'

interface HesabimClientProps {
  user: { id: string; email?: string }
  profile: any
  orders: any[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  paid: 'Ödendi',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

export default function HesabimClient({
  user,
  profile,
  orders,
}: HesabimClientProps) {
  const [tab, setTab] = useState('profil')
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const saveProfile = async () => {
    setSaving(true)
    await supabase.from('user_profiles').upsert({
      id: user.id,
      ...profileForm,
      updated_at: new Date().toISOString(),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] font-light text-text-primary mb-2">
        Hesabım
      </h1>
      <div className="w-16 h-px bg-gold mb-8" />

      {/* Tabs */}
      <div className="flex gap-8 border-b border-champagne-mid mb-8">
        {(['profil', 'siparisler'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-[11px] uppercase tracking-[0.15em] font-body transition-colors ${
              tab === t
                ? 'border-b-2 border-gold text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t === 'profil' ? 'Profilim' : 'Siparişlerim'}
          </button>
        ))}
      </div>

      {/* Profil */}
      {tab === 'profil' && (
        <div className="max-w-md space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">
              E-posta
            </label>
            <p className="text-[14px] font-body text-text-primary">
              {user.email}
            </p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">
              Ad Soyad
            </label>
            <Input
              type="text"
              value={profileForm.full_name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, full_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">
              Telefon
            </label>
            <Input
              type="tel"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="py-3 px-8 bg-dark text-champagne text-[11px] tracking-[0.15em] uppercase font-body hover:bg-gold transition-colors disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : saved ? 'Kaydedildi ✓' : 'Kaydet'}
          </button>

          <div className="pt-8 border-t border-champagne-mid">
            <button
              onClick={signOut}
              className="text-[12px] font-body text-text-muted hover:text-red-500 transition-colors"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* Siparişler */}
      {tab === 'siparisler' && (
        <div>
          {orders.length === 0 ? (
            <p className="text-text-muted font-body text-[13px]">
              Henüz siparişiniz bulunmuyor.
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className="border border-champagne-mid p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-body text-[14px] font-medium text-text-primary">
                        {order.order_number}
                      </p>
                      <p className="text-[12px] font-body text-text-muted">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-body px-2 py-1 rounded ${statusColors[order.status] || 'bg-gray-100'}`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                      <p className="font-body text-[14px] font-medium text-gold mt-2">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                  {order.items?.map((item: any, i: number) => (
                    <p
                      key={i}
                      className="text-[12px] font-body text-text-secondary"
                    >
                      {item.name} × {item.quantity}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
