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

const requestTypeLabels: Record<string, string> = {
  cancel: 'İptal talebi',
  return: 'İade talebi',
}

const requestStatusLabels: Record<string, string> = {
  pending: 'İncelemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}

function formatShippingSummary(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return null
  const a = addr as Record<string, string | undefined>
  const line1 = [a.full_name, a.phone].filter(Boolean).join(' · ')
  const cityLine = [a.district, a.city].filter(Boolean).join(', ')
  const parts = [line1, cityLine, a.address].filter((p) => p && String(p).trim())
  return parts.length ? parts.join(' — ') : null
}

function orderLineItems(items: any[] | undefined) {
  if (!Array.isArray(items)) return []
  return items.filter((item) => {
    const id = item?.productId ?? item?.product_id
    return id !== 'KARGO'
  })
}

function hasPendingCustomerRequest(requests: any[] | undefined) {
  return Array.isArray(requests) && requests.some((r) => r.status === 'pending')
}

const btnPrimary = 'py-3 px-8 bg-text-primary text-white text-[11px] tracking-[0.15em] uppercase font-body hover:bg-gold transition-colors disabled:opacity-50'
const btnOutline = 'py-2 px-4 border border-champagne-mid text-text-secondary text-[10px] tracking-[0.12em] uppercase font-body hover:border-gold hover:text-gold transition-colors disabled:opacity-50 disabled:pointer-events-none'
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

  const [orderRequestsByOrderId, setOrderRequestsByOrderId] = useState<Record<string, any[]>>({})
  const [orderRequestsLoading, setOrderRequestsLoading] = useState(false)
  const [orderRequestOpenForm, setOrderRequestOpenForm] = useState<{
    orderId: string
    kind: 'cancel' | 'return'
  } | null>(null)
  const [orderRequestFormReason, setOrderRequestFormReason] = useState('')
  const [orderRequestSubmittingId, setOrderRequestSubmittingId] = useState<string | null>(null)
  const [orderRequestFlash, setOrderRequestFlash] = useState<
    Record<string, { type: 'success' | 'error'; msg: string }>
  >({})

  useEffect(() => {
    if (wishlistItems.length === 0) { setFavProducts([]); return }
    supabase.from('products_display').select('*').in('id', wishlistItems)
      .then(({ data }) => setFavProducts(data || []))
  }, [wishlistItems])

  useEffect(() => {
    if (tab !== 'siparisler' || orders.length === 0) {
      return
    }
    let cancelled = false
    ;(async () => {
      setOrderRequestsLoading(true)
      const entries = await Promise.all(
        orders.map(async (o: any) => {
          const res = await fetch(`/api/account/orders/${o.id}/requests`)
          const json = await res.json().catch(() => ({}))
          const list = res.ok && Array.isArray(json.requests) ? json.requests : []
          return [o.id, list] as const
        })
      )
      if (cancelled) return
      const next: Record<string, any[]> = {}
      for (const [id, list] of entries) next[id] = list
      setOrderRequestsByOrderId(next)
      setOrderRequestsLoading(false)
    })()
    return () => {
      cancelled = true
      setOrderRequestsLoading(false)
    }
  }, [tab, orders])

  const refreshOrderRequests = async (orderId: string) => {
    const res = await fetch(`/api/account/orders/${orderId}/requests`)
    const json = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(json.requests)) {
      setOrderRequestsByOrderId((prev) => ({ ...prev, [orderId]: json.requests }))
    }
  }

  const submitOrderRequest = async (orderId: string, kind: 'cancel' | 'return') => {
    setOrderRequestSubmittingId(orderId)
    setOrderRequestFlash((prev) => {
      const n = { ...prev }
      delete n[orderId]
      return n
    })
    try {
      const path =
        kind === 'cancel' ? 'cancel-request' : 'return-request'
      const res = await fetch(`/api/account/orders/${orderId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: orderRequestFormReason.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOrderRequestFlash((prev) => ({
          ...prev,
          [orderId]: {
            type: 'error',
            msg:
              typeof json.error === 'string'
                ? json.error
                : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
          },
        }))
        return
      }
      setOrderRequestOpenForm(null)
      setOrderRequestFormReason('')
      setOrderRequestFlash((prev) => ({
        ...prev,
        [orderId]: {
          type: 'success',
          msg:
            kind === 'cancel'
              ? 'İptal talebiniz alındı. En kısa sürede değerlendirilecektir.'
              : 'İade talebiniz alındı. En kısa sürede değerlendirilecektir.',
        },
      }))
      await refreshOrderRequests(orderId)
      router.refresh()
    } finally {
      setOrderRequestSubmittingId(null)
    }
  }

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
            <div className="space-y-6">
              {orders.map((order: any) => {
                const requests = orderRequestsByOrderId[order.id] ?? []
                const latestRequest = requests[0]
                const shippingLine = formatShippingSummary(order.shipping_address)
                const lines = orderLineItems(order.items)
                const pendingReq = hasPendingCustomerRequest(requests)
                const busy = orderRequestSubmittingId === order.id
                const showCancelBtn =
                  (order.status === 'paid' || order.status === 'preparing') && !pendingReq
                const showReturnBtn = order.status === 'delivered' && !pendingReq
                const flash = orderRequestFlash[order.id]
                const formOpen =
                  orderRequestOpenForm && orderRequestOpenForm.orderId === order.id
                    ? orderRequestOpenForm.kind
                    : null

                return (
                  <div key={order.id} className="border border-champagne-mid p-6 bg-white/40">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                      <div>
                        <p className="font-body text-[11px] uppercase tracking-[0.15em] text-text-muted mb-1">
                          Sipariş numarası
                        </p>
                        <p className="font-body text-[15px] font-medium text-text-primary">
                          {order.order_number}
                        </p>
                        <p className="text-[12px] font-body text-text-muted mt-1">
                          {new Date(order.created_at).toLocaleString('tr-TR', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span
                          className={`inline-block text-[10px] font-body px-2 py-1 rounded ${
                            statusColors[order.status] || 'bg-gray-100'
                          }`}
                        >
                          {statusLabels[order.status] || order.status}
                        </span>
                        <p className="font-body text-[16px] font-medium text-gold mt-2">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                    </div>

                    {shippingLine ? (
                      <div className="mb-4 pb-4 border-b border-champagne-mid/40">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body mb-1">
                          Teslimat adresi
                        </p>
                        <p className="text-[12px] font-body text-text-secondary leading-relaxed">
                          {shippingLine}
                        </p>
                      </div>
                    ) : null}

                    {order.status === 'shipped' && order.tracking_number ? (
                      <div className="mb-4 p-3 bg-champagne/80 border border-champagne-mid/50">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body mb-1">
                          Kargo takip
                        </p>
                        <p className="text-[13px] font-body text-text-primary font-medium tracking-wide">
                          {String(order.tracking_number)}
                        </p>
                      </div>
                    ) : null}

                    {order.status === 'cancelled' ? (
                      <div className="mb-4 p-3 bg-red-50/90 border border-red-100">
                        <p className="text-[12px] font-body text-text-secondary leading-relaxed">
                          Bu sipariş iptal edilmiştir. Ödeme iadesi süreçleri tamamlandıysa kartınıza
                          yansıması bankanıza bağlıdır.
                        </p>
                      </div>
                    ) : null}

                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body mb-2">
                        Ürünler
                      </p>
                      <ul className="space-y-1">
                        {lines.length === 0 ? (
                          <li className="text-[12px] font-body text-text-muted">Ürün satırı yok.</li>
                        ) : (
                          lines.map((item: any, i: number) => (
                            <li
                              key={i}
                              className="text-[12px] font-body text-text-secondary flex justify-between gap-4"
                            >
                              <span>{item.name}</span>
                              <span className="shrink-0 text-text-muted">× {item.quantity}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="mb-4 p-3 border border-champagne-mid/60 bg-champagne/30">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body mb-2">
                        Talep durumu
                      </p>
                      {orderRequestsLoading && requests.length === 0 ? (
                        <p className="text-[12px] font-body text-text-muted">Yükleniyor...</p>
                      ) : latestRequest ? (
                        <div className="space-y-1">
                          <p className="text-[12px] font-body text-text-primary">
                            <span className="text-text-muted">Son talep:</span>{' '}
                            {requestTypeLabels[latestRequest.request_type] ||
                              latestRequest.request_type}
                            {' · '}
                            <span className="font-medium">
                              {requestStatusLabels[latestRequest.status] || latestRequest.status}
                            </span>
                          </p>
                          <p className="text-[11px] font-body text-text-muted">
                            {new Date(latestRequest.created_at).toLocaleString('tr-TR', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[12px] font-body text-text-muted">
                          Henüz bir iptal veya iade talebiniz yok.
                        </p>
                      )}
                    </div>

                    {flash ? (
                      <div
                        className={`mb-4 text-[12px] font-body px-3 py-2 border ${
                          flash.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        {flash.msg}
                      </div>
                    ) : null}

                    {pendingReq ? (
                      <p className="text-[11px] font-body text-text-muted mb-2">
                        Bekleyen bir talebiniz var; yeni talep oluşturmadan önce sonuçlanmasını
                        bekleyin.
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-3">
                      {showCancelBtn ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setOrderRequestOpenForm({ orderId: order.id, kind: 'cancel' })
                            setOrderRequestFormReason('')
                            setOrderRequestFlash((p) => {
                              const n = { ...p }
                              delete n[order.id]
                              return n
                            })
                          }}
                          className={btnOutline}
                        >
                          Sipariş İptal Talebi Oluştur
                        </button>
                      ) : null}
                      {showReturnBtn ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setOrderRequestOpenForm({ orderId: order.id, kind: 'return' })
                            setOrderRequestFormReason('')
                            setOrderRequestFlash((p) => {
                              const n = { ...p }
                              delete n[order.id]
                              return n
                            })
                          }}
                          className={btnOutline}
                        >
                          İade Talebi Oluştur
                        </button>
                      ) : null}
                    </div>

                    {formOpen ? (
                      <div className="mt-4 pt-4 border-t border-champagne-mid/40 space-y-3">
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body block mb-1">
                            Açıklama{' '}
                            <span className="normal-case tracking-normal text-text-muted">
                              (isteğe bağlı)
                            </span>
                          </span>
                          <textarea
                            className={`${inputClass} resize-none min-h-[88px]`}
                            value={orderRequestFormReason}
                            onChange={(e) => setOrderRequestFormReason(e.target.value)}
                            disabled={busy}
                            placeholder="Talebinizle ilgili kısa bir not ekleyebilirsiniz."
                            maxLength={4000}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => submitOrderRequest(order.id, formOpen)}
                            className="py-2 px-5 bg-gold text-white text-[10px] tracking-[0.12em] uppercase font-body hover:bg-gold-light transition-colors disabled:opacity-50"
                          >
                            {busy ? 'Gönderiliyor...' : 'Talebi Gönder'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setOrderRequestOpenForm(null)
                              setOrderRequestFormReason('')
                            }}
                            className={btnOutline}
                          >
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
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
