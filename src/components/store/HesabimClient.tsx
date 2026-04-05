'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { useWishlist } from '@/hooks/useWishlist'
import ProductGrid from '@/components/store/ProductGrid'
import Input from '@/components/ui/Input'

interface HesabimClientProps {
  user: { id: string; email?: string; user_metadata?: any }
  profile: any
  orders: any[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  paid: 'Ödendi',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

const btnPrimary = 'py-3 px-8 bg-text-primary text-white text-[11px] tracking-[0.15em] uppercase font-body hover:bg-gold transition-colors disabled:opacity-50'
const inputClass = 'w-full px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors'

export default function HesabimClient({ user, profile, orders }: HesabimClientProps) {
  const [tab, setTab] = useState('profil')
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    phone: profile?.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [favProducts, setFavProducts] = useState<any[]>([])
  const wishlistItems = useWishlist((s) => s.items)
  const router = useRouter()
  const supabase = createClient()

  // Addresses
  const [addresses, setAddresses] = useState<any[]>([])
  const [addressLoaded, setAddressLoaded] = useState(false)
  const [addressForm, setAddressForm] = useState<any>(null)
  const [addressSaving, setAddressSaving] = useState(false)
  const emptyAddress = { id: null, title: '', full_name: '', phone: '', city: '', district: '', address: '', is_default: false }

  // Billing
  const [billing, setBilling] = useState<any>(null)
  const [billingLoaded, setBillingLoaded] = useState(false)
  const [billingForm, setBillingForm] = useState({
    billing_type: 'individual',
    full_name: '', tc_no: '', company_name: '', tax_office: '', tax_no: '',
    city: '', district: '', address: '',
  })
  const [billingSaving, setBillingSaving] = useState(false)
  const [billingSaved, setBillingSaved] = useState(false)

  useEffect(() => {
    if (wishlistItems.length === 0) { setFavProducts([]); return }
    supabase.from('products_display').select('*').in('id', wishlistItems)
      .then(({ data }) => setFavProducts(data || []))
  }, [wishlistItems])

  const loadAddresses = async () => {
    const { data } = await supabase.from('user_addresses').select('*').eq('user_id', user.id).order('created_at')
    setAddresses(data || [])
    setAddressLoaded(true)
  }

  const loadBilling = async () => {
    const { data } = await supabase.from('user_billing').select('*').eq('user_id', user.id).single()
    if (data) {
      setBilling(data)
      setBillingForm({
        billing_type: data.billing_type || 'individual',
        full_name: data.full_name || '', tc_no: data.tc_no || '',
        company_name: data.company_name || '', tax_office: data.tax_office || '',
        tax_no: data.tax_no || '', city: data.city || '',
        district: data.district || '', address: data.address || '',
      })
    }
    setBillingLoaded(true)
  }

  const handleTabClick = (t: string) => {
    setTab(t)
    if (t === 'adresler' && !addressLoaded) loadAddresses()
    if (t === 'fatura' && !billingLoaded) loadBilling()
  }

  const saveProfile = async () => {
    setSaving(true)
    await supabase.from('user_profiles').upsert({ id: user.id, ...profileForm, updated_at: new Date().toISOString() })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveAddress = async () => {
    if (!addressForm) return
    setAddressSaving(true)
    const payload = { ...addressForm, user_id: user.id }
    if (addressForm.id) {
      const { data } = await supabase.from('user_addresses').update(payload).eq('id', addressForm.id).select().single()
      setAddresses((prev) => prev.map((a) => a.id === addressForm.id ? data : a))
    } else {
      delete payload.id
      const { data } = await supabase.from('user_addresses').insert(payload).select().single()
      if (data) setAddresses((prev) => [...prev, data])
    }
    setAddressForm(null)
    setAddressSaving(false)
  }

  const deleteAddress = async (id: string) => {
    if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return
    await supabase.from('user_addresses').delete().eq('id', id)
    setAddresses((prev) => prev.filter((a) => a.id !== id))
  }

  const saveBilling = async () => {
    setBillingSaving(true)
    const payload = { ...billingForm, user_id: user.id }
    if (billing?.id) {
      await supabase.from('user_billing').update(payload).eq('id', billing.id)
    } else {
      await supabase.from('user_billing').insert(payload)
    }
    setBillingSaved(true)
    setBillingSaving(false)
    setTimeout(() => setBillingSaved(false), 2000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const tabs = [
    { id: 'profil', label: 'Profilim' },
    { id: 'siparisler', label: 'Siparişlerim' },
    { id: 'adresler', label: 'Adreslerim' },
    { id: 'fatura', label: 'Fatura Bilgilerim' },
    { id: 'favoriler', label: 'Favorilerim' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] font-light text-text-primary mb-2">Hesabım</h1>
      <div className="w-16 h-px bg-gold mb-8" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-6 border-b border-champagne-mid mb-8">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => handleTabClick(t.id)}
            className={`pb-3 text-[11px] uppercase tracking-[0.15em] font-body transition-colors ${
              tab === t.id ? 'border-b-2 border-gold text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profil ── */}
      {tab === 'profil' && (
        <div className="max-w-md space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">E-posta</label>
            <p className="text-[14px] font-body text-text-primary">{user.email}</p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">Ad Soyad</label>
            <Input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">Telefon</label>
            <Input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
          </div>
          <button onClick={saveProfile} disabled={saving} className={btnPrimary}>
            {saving ? 'Kaydediliyor...' : saved ? 'Kaydedildi ✓' : 'Kaydet'}
          </button>
          <div className="pt-8 border-t border-champagne-mid">
            <button onClick={signOut} className="text-[12px] font-body text-text-muted hover:text-red-500 transition-colors">
              Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* ── Siparişler ── */}
      {tab === 'siparisler' && (
        <div>
          {orders.length === 0 ? (
            <p className="text-text-muted font-body text-[13px]">Henüz siparişiniz bulunmuyor.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <div key={order.id} className="border border-champagne-mid p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-body text-[14px] font-medium text-text-primary">{order.order_number}</p>
                      <p className="text-[12px] font-body text-text-muted">{new Date(order.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-body px-2 py-1 rounded ${statusColors[order.status] || 'bg-gray-100'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                      <p className="font-body text-[14px] font-medium text-gold mt-2">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                  {order.items?.map((item: any, i: number) => (
                    <p key={i} className="text-[12px] font-body text-text-secondary">{item.name} × {item.quantity}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Adresler ── */}
      {tab === 'adresler' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-[20px] text-text-primary">Kayıtlı Adreslerim</h2>
            <button onClick={() => setAddressForm({ ...emptyAddress })} className={btnPrimary}>+ Yeni Adres</button>
          </div>

          {!addressLoaded ? (
            <p className="text-text-muted font-body text-sm">Yükleniyor...</p>
          ) : addresses.length === 0 ? (
            <p className="text-text-muted font-body text-[13px]">Henüz kayıtlı adresiniz yok.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div key={addr.id} className="border border-champagne-mid p-5 relative">
                  {addr.is_default && (
                    <span className="text-[9px] bg-gold text-white px-2 py-0.5 uppercase tracking-wider font-body absolute top-3 right-3">Varsayılan</span>
                  )}
                  <p className="font-body text-[13px] font-semibold text-text-primary mb-1">{addr.title}</p>
                  <p className="font-body text-[12px] text-text-secondary">{addr.full_name}</p>
                  <p className="font-body text-[12px] text-text-secondary">{addr.phone}</p>
                  <p className="font-body text-[12px] text-text-secondary">{addr.district}, {addr.city}</p>
                  <p className="font-body text-[12px] text-text-secondary">{addr.address}</p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => setAddressForm({ ...addr })} className="text-[11px] text-gold hover:text-gold-light font-body transition-colors">Düzenle</button>
                    <button onClick={() => deleteAddress(addr.id)} className="text-[11px] text-red-400 hover:text-red-600 font-body transition-colors">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Address form modal */}
          {addressForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white w-full max-w-md p-6 space-y-3 my-8">
                <h3 className="font-heading text-[20px]">{addressForm.id ? 'Adresi Düzenle' : 'Yeni Adres'}</h3>
                <input className={inputClass} placeholder="Adres başlığı (Ev, İş...)" value={addressForm.title} onChange={(e) => setAddressForm((f: any) => ({ ...f, title: e.target.value }))} />
                <input className={inputClass} placeholder="Ad Soyad" value={addressForm.full_name} onChange={(e) => setAddressForm((f: any) => ({ ...f, full_name: e.target.value }))} />
                <input className={inputClass} placeholder="Telefon" value={addressForm.phone} onChange={(e) => setAddressForm((f: any) => ({ ...f, phone: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} placeholder="Şehir" value={addressForm.city} onChange={(e) => setAddressForm((f: any) => ({ ...f, city: e.target.value }))} />
                  <input className={inputClass} placeholder="İlçe" value={addressForm.district} onChange={(e) => setAddressForm((f: any) => ({ ...f, district: e.target.value }))} />
                </div>
                <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Açık adres" value={addressForm.address} onChange={(e) => setAddressForm((f: any) => ({ ...f, address: e.target.value }))} />
                <label className="flex items-center gap-2 text-[12px] font-body">
                  <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm((f: any) => ({ ...f, is_default: e.target.checked }))} />
                  Varsayılan adres olarak ayarla
                </label>
                <div className="flex gap-3 pt-2">
                  <button onClick={saveAddress} disabled={addressSaving} className="flex-1 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50">
                    {addressSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => setAddressForm(null)} className="flex-1 py-2 border border-champagne-mid text-text-muted text-[11px] uppercase tracking-wider hover:border-gold transition-colors">
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Fatura Bilgileri ── */}
      {tab === 'fatura' && (
        <div className="max-w-md">
          <h2 className="font-heading text-[20px] text-text-primary mb-6">Fatura Bilgilerim</h2>

          {/* Type toggle */}
          <div className="flex gap-0 mb-6 border border-champagne-mid">
            {(['individual', 'corporate'] as const).map((type) => (
              <button key={type} onClick={() => setBillingForm((f) => ({ ...f, billing_type: type }))}
                className={`flex-1 py-2 text-[11px] uppercase tracking-wider font-body transition-colors ${
                  billingForm.billing_type === type ? 'bg-text-primary text-white' : 'text-text-muted hover:text-text-primary'
                }`}>
                {type === 'individual' ? 'Bireysel' : 'Kurumsal'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {billingForm.billing_type === 'individual' ? (
              <>
                <input className={inputClass} placeholder="Ad Soyad" value={billingForm.full_name} onChange={(e) => setBillingForm((f) => ({ ...f, full_name: e.target.value }))} />
                <input className={inputClass} placeholder="TC Kimlik No" value={billingForm.tc_no} onChange={(e) => setBillingForm((f) => ({ ...f, tc_no: e.target.value }))} />
              </>
            ) : (
              <>
                <input className={inputClass} placeholder="Şirket Adı" value={billingForm.company_name} onChange={(e) => setBillingForm((f) => ({ ...f, company_name: e.target.value }))} />
                <input className={inputClass} placeholder="Vergi Dairesi" value={billingForm.tax_office} onChange={(e) => setBillingForm((f) => ({ ...f, tax_office: e.target.value }))} />
                <input className={inputClass} placeholder="Vergi No" value={billingForm.tax_no} onChange={(e) => setBillingForm((f) => ({ ...f, tax_no: e.target.value }))} />
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input className={inputClass} placeholder="Şehir" value={billingForm.city} onChange={(e) => setBillingForm((f) => ({ ...f, city: e.target.value }))} />
              <input className={inputClass} placeholder="İlçe" value={billingForm.district} onChange={(e) => setBillingForm((f) => ({ ...f, district: e.target.value }))} />
            </div>
            <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Fatura adresi" value={billingForm.address} onChange={(e) => setBillingForm((f) => ({ ...f, address: e.target.value }))} />
          </div>

          <button onClick={saveBilling} disabled={billingSaving} className={`mt-4 ${btnPrimary}`}>
            {billingSaving ? 'Kaydediliyor...' : billingSaved ? 'Kaydedildi ✓' : 'Kaydet'}
          </button>
        </div>
      )}

      {/* ── Favoriler ── */}
      {tab === 'favoriler' && (
        <div>
          {wishlistItems.length === 0 ? (
            <p className="text-text-muted font-body text-[13px]">Henüz favoriye eklediğiniz ürün yok.</p>
          ) : (
            <ProductGrid products={favProducts} />
          )}
        </div>
      )}
    </div>
  )
}
