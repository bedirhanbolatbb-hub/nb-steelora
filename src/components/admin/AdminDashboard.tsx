'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface AdminDashboardProps {
  orders: any[]
  products: any[]
  campaigns: any[]
  syncLogs: any[]
}

const tabs = [
  { id: 'orders', label: '📦 Siparişler' },
  { id: 'products', label: '🛍️ Ürünler' },
  { id: 'campaigns', label: '🎯 Kampanyalar' },
  { id: 'sync', label: '🔄 Sync' },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  paid: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

export default function AdminDashboard({ orders, products, campaigns, syncLogs }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('orders')
  const [localOrders, setLocalOrders] = useState(orders)
  const [localCampaigns, setLocalCampaigns] = useState(campaigns)
  const [localProducts, setLocalProducts] = useState(products)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  // ─── Orders ───
  const updateOrderStatus = async (orderId: string, status: string) => {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    )
  }

  // ─── Sync ───
  const triggerSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` },
      })
      const data = await res.json()
      setSyncResult(data)
    } catch {
      setSyncResult({ error: 'Bağlantı hatası' })
    }
    setSyncing(false)
  }

  // ─── Campaigns ───
  const [campaignForm, setCampaignForm] = useState({
    name: '', type: 'discount_code' as string, code: '', discount_type: 'percent',
    discount_value: '', min_cart_amount: '0', max_uses: '',
    banner_text: '', banner_color: '#2A1E1E',
    starts_at: '', ends_at: '',
  })

  const saveCampaign = async () => {
    const body: any = {
      name: campaignForm.name,
      type: campaignForm.type,
      is_active: true,
      starts_at: campaignForm.starts_at || new Date().toISOString(),
      ends_at: campaignForm.ends_at || null,
    }
    if (campaignForm.type === 'discount_code' || campaignForm.type === 'cart_discount') {
      body.code = campaignForm.type === 'discount_code' ? campaignForm.code.toUpperCase() : null
      body.discount_type = campaignForm.discount_type
      body.discount_value = Number(campaignForm.discount_value)
      body.min_cart_amount = Number(campaignForm.min_cart_amount)
      body.max_uses = campaignForm.max_uses ? Number(campaignForm.max_uses) : null
    }
    if (campaignForm.type === 'free_shipping') {
      body.min_cart_amount = Number(campaignForm.min_cart_amount)
    }
    if (campaignForm.type === 'banner') {
      body.banner_text = campaignForm.banner_text
      body.banner_color = campaignForm.banner_color
    }
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const { data } = await res.json()
      if (data) setLocalCampaigns((prev) => [data, ...prev])
      setShowCampaignForm(false)
      setCampaignForm({ name: '', type: 'discount_code', code: '', discount_type: 'percent', discount_value: '', min_cart_amount: '0', max_uses: '', banner_text: '', banner_color: '#2A1E1E', starts_at: '', ends_at: '' })
    }
  }

  const toggleCampaign = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    setLocalCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !isActive } : c))
    )
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
    setLocalCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  // ─── Product Override ───
  const saveProductOverride = async () => {
    if (!editingProduct) return
    await fetch(`/api/admin/orders/${editingProduct.id}?type=product`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        override_title: editingProduct.override_title || null,
        override_price: editingProduct.override_price ? Number(editingProduct.override_price) : null,
        override_description: editingProduct.override_description || null,
        is_featured: editingProduct.is_featured,
        is_active: editingProduct.is_active,
      }),
    })
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? { ...editingProduct } : p))
    )
    setEditingProduct(null)
  }

  const pendingCount = localOrders.filter((o) => o.status === 'pending').length

  const inputClass = 'w-full px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors'

  return (
    <div className="min-h-screen bg-champagne flex">
      {/* Sidebar */}
      <aside className="w-56 bg-dark text-champagne shrink-0 flex flex-col">
        <div className="p-5 border-b border-champagne-mid/10">
          <h1 className="font-heading text-[18px] font-light tracking-wider">
            NB Steelora
          </h1>
          <p className="text-[9px] text-text-muted uppercase tracking-widest mt-0.5">
            Admin Panel
          </p>
        </div>
        <nav className="flex-1 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-5 py-3 text-[12px] font-body transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gold/20 text-gold'
                  : 'text-champagne-mid/70 hover:text-champagne hover:bg-champagne-mid/5'
              }`}
            >
              {tab.label}
              {tab.id === 'orders' && pendingCount > 0 && (
                <span className="ml-auto bg-gold text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
              {tab.id === 'products' && (
                <span className="ml-auto text-[10px] text-text-muted">{localProducts.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-champagne-mid/10">
          <button
            onClick={handleLogout}
            className="w-full text-[11px] text-text-muted hover:text-gold transition-colors font-body uppercase tracking-wider"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {/* ═══ ORDERS ═══ */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="font-heading text-[24px] text-text-primary mb-6">Siparişler</h2>
            {localOrders.length === 0 ? (
              <p className="text-text-muted font-body text-sm">Henüz sipariş yok.</p>
            ) : (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-[12px] font-body">
                  <thead>
                    <tr className="border-b border-champagne-mid text-text-muted uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Sipariş No</th>
                      <th className="text-left px-4 py-3">Tarih</th>
                      <th className="text-left px-4 py-3">Müşteri</th>
                      <th className="text-right px-4 py-3">Toplam</th>
                      <th className="text-center px-4 py-3">Durum</th>
                      <th className="text-center px-4 py-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localOrders.map((order) => (
                      <tr key={order.id} className="border-b border-champagne-mid/30 hover:bg-champagne/50">
                        <td className="px-4 py-3 font-medium">{order.order_number}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {new Date(order.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">{order.guest_email || '-'}</td>
                        <td className="px-4 py-3 text-right text-gold font-medium">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${statusColors[order.status] || 'bg-gray-100'}`}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="text-[11px] border border-champagne-mid px-2 py-1 rounded bg-white focus:outline-none"
                          >
                            <option value="pending">Bekliyor</option>
                            <option value="paid">Hazırlanıyor</option>
                            <option value="shipped">Kargoda</option>
                            <option value="delivered">Teslim Edildi</option>
                            <option value="cancelled">İptal</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ PRODUCTS ═══ */}
        {activeTab === 'products' && (
          <div>
            <h2 className="font-heading text-[24px] text-text-primary mb-6">Ürünler</h2>
            {localProducts.length === 0 ? (
              <p className="text-text-muted font-body text-sm">Henüz ürün yok. Trendyol sync yapın.</p>
            ) : (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-[12px] font-body">
                  <thead>
                    <tr className="border-b border-champagne-mid text-text-muted uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Ürün</th>
                      <th className="text-left px-4 py-3">Kategori</th>
                      <th className="text-right px-4 py-3">Fiyat</th>
                      <th className="text-center px-4 py-3">Stok</th>
                      <th className="text-center px-4 py-3">Override</th>
                      <th className="text-center px-4 py-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localProducts.map((p: any) => (
                      <tr key={p.id} className="border-b border-champagne-mid/30 hover:bg-champagne/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-12 bg-champagne-dark shrink-0" />
                            <span className="font-medium truncate max-w-[200px]">{p.display_title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{p.trendyol_category || '-'}</td>
                        <td className="px-4 py-3 text-right text-gold">{formatPrice(p.display_price)}</td>
                        <td className="px-4 py-3 text-center">{p.trendyol_stock}</td>
                        <td className="px-4 py-3 text-center">
                          {(p.override_title || p.override_price) ? (
                            <span className="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">VAR</span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setEditingProduct({ ...p })}
                            className="text-[10px] text-gold hover:text-gold-light transition-colors uppercase tracking-wider"
                          >
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Edit Modal */}
            {editingProduct && (
              <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md p-6 space-y-4">
                  <h3 className="font-heading text-[20px]">Ürün Düzenle</h3>
                  <p className="text-[11px] text-text-muted font-body">Trendyol: {editingProduct.trendyol_title}</p>
                  <input className={inputClass} placeholder="Override Başlık (boş = Trendyol)" value={editingProduct.override_title || ''} onChange={(e) => setEditingProduct({ ...editingProduct, override_title: e.target.value })} />
                  <input className={inputClass} placeholder="Override Fiyat (boş = Trendyol)" type="number" value={editingProduct.override_price || ''} onChange={(e) => setEditingProduct({ ...editingProduct, override_price: e.target.value })} />
                  <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Override Açıklama" value={editingProduct.override_description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, override_description: e.target.value })} />
                  <label className="flex items-center gap-2 text-[12px] font-body">
                    <input type="checkbox" checked={editingProduct.is_featured} onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })} />
                    Öne Çıkar
                  </label>
                  <label className="flex items-center gap-2 text-[12px] font-body">
                    <input type="checkbox" checked={editingProduct.is_active} onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })} />
                    Aktif
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button onClick={saveProductOverride} className="flex-1 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors">Kaydet</button>
                    <button onClick={() => setEditingProduct(null)} className="flex-1 py-2 border border-champagne-mid text-text-muted text-[11px] uppercase tracking-wider hover:border-gold transition-colors">İptal</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ CAMPAIGNS ═══ */}
        {activeTab === 'campaigns' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-[24px] text-text-primary">Kampanyalar</h2>
              <button
                onClick={() => setShowCampaignForm(!showCampaignForm)}
                className="px-4 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors"
              >
                {showCampaignForm ? 'İptal' : '+ Yeni Kampanya'}
              </button>
            </div>

            {showCampaignForm && (
              <div className="bg-white p-6 mb-6 space-y-4">
                <input className={inputClass} placeholder="Kampanya Adı *" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
                <select className={inputClass} value={campaignForm.type} onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}>
                  <option value="discount_code">İndirim Kodu</option>
                  <option value="cart_discount">Sepet İndirimi</option>
                  <option value="free_shipping">Ücretsiz Kargo</option>
                  <option value="banner">Duyuru Banner</option>
                </select>

                {(campaignForm.type === 'discount_code' || campaignForm.type === 'cart_discount') && (
                  <>
                    {campaignForm.type === 'discount_code' && (
                      <input className={inputClass} placeholder="Kod (ör: YAZ2026)" value={campaignForm.code} onChange={(e) => setCampaignForm({ ...campaignForm, code: e.target.value.toUpperCase() })} />
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <select className={inputClass} value={campaignForm.discount_type} onChange={(e) => setCampaignForm({ ...campaignForm, discount_type: e.target.value })}>
                        <option value="percent">% İndirim</option>
                        <option value="fixed">Sabit TL</option>
                      </select>
                      <input className={inputClass} placeholder="Miktar" type="number" value={campaignForm.discount_value} onChange={(e) => setCampaignForm({ ...campaignForm, discount_value: e.target.value })} />
                    </div>
                    <input className={inputClass} placeholder="Min. Sepet Tutarı (₺)" type="number" value={campaignForm.min_cart_amount} onChange={(e) => setCampaignForm({ ...campaignForm, min_cart_amount: e.target.value })} />
                    {campaignForm.type === 'discount_code' && (
                      <input className={inputClass} placeholder="Max Kullanım (boş = sınırsız)" type="number" value={campaignForm.max_uses} onChange={(e) => setCampaignForm({ ...campaignForm, max_uses: e.target.value })} />
                    )}
                  </>
                )}

                {campaignForm.type === 'free_shipping' && (
                  <input className={inputClass} placeholder="Min. Sepet Tutarı (0 = her zaman)" type="number" value={campaignForm.min_cart_amount} onChange={(e) => setCampaignForm({ ...campaignForm, min_cart_amount: e.target.value })} />
                )}

                {campaignForm.type === 'banner' && (
                  <>
                    <input className={inputClass} placeholder="Banner Metni" value={campaignForm.banner_text} onChange={(e) => setCampaignForm({ ...campaignForm, banner_text: e.target.value })} />
                    <div className="flex items-center gap-3">
                      <label className="text-[12px] font-body text-text-muted">Renk:</label>
                      <input type="color" value={campaignForm.banner_color} onChange={(e) => setCampaignForm({ ...campaignForm, banner_color: e.target.value })} className="w-10 h-8 border-0 cursor-pointer" />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-body text-text-muted uppercase tracking-wider">Başlangıç</label>
                    <input className={inputClass} type="datetime-local" value={campaignForm.starts_at} onChange={(e) => setCampaignForm({ ...campaignForm, starts_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-body text-text-muted uppercase tracking-wider">Bitiş</label>
                    <input className={inputClass} type="datetime-local" value={campaignForm.ends_at} onChange={(e) => setCampaignForm({ ...campaignForm, ends_at: e.target.value })} />
                  </div>
                </div>

                <button onClick={saveCampaign} disabled={!campaignForm.name} className="w-full py-2.5 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50">
                  Kampanya Oluştur
                </button>
              </div>
            )}

            <div className="space-y-3">
              {localCampaigns.length === 0 ? (
                <p className="text-text-muted font-body text-sm">Henüz kampanya yok.</p>
              ) : (
                localCampaigns.map((c: any) => (
                  <div key={c.id} className="bg-white p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[13px] font-medium text-text-primary">{c.name}</span>
                        <span className="text-[9px] bg-champagne-dark px-1.5 py-0.5 rounded text-text-muted uppercase">{c.type.replace('_', ' ')}</span>
                        {!c.is_active && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pasif</span>}
                      </div>
                      <div className="text-[11px] text-text-muted font-body mt-1 space-x-3">
                        {c.code && <span>Kod: <strong>{c.code}</strong></span>}
                        {c.discount_value && <span>{c.discount_type === 'percent' ? `%${c.discount_value}` : `${c.discount_value}₺`}</span>}
                        {c.banner_text && <span>{c.banner_text}</span>}
                        {c.max_uses && <span>Kullanım: {c.used_count}/{c.max_uses}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCampaign(c.id, c.is_active)}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${c.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {c.is_active ? 'Aktif' : 'Pasif'}
                      </button>
                      <button onClick={() => deleteCampaign(c.id)} className="text-[10px] text-red-400 hover:text-red-600 transition-colors px-2 py-1">
                        Sil
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ SYNC ═══ */}
        {activeTab === 'sync' && (
          <div>
            <h2 className="font-heading text-[24px] text-text-primary mb-6">Trendyol Sync</h2>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="px-6 py-3 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50 mb-6"
            >
              {syncing ? 'Sync yapılıyor...' : 'Manuel Sync Başlat'}
            </button>

            {syncResult && (
              <div className={`p-4 mb-6 text-[12px] font-body ${syncResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {syncResult.success
                  ? `✓ ${syncResult.productsAdded} ürün eklendi, ${syncResult.productsUpdated} ürün güncellendi (${syncResult.duration}ms)`
                  : `✗ Hata: ${syncResult.error}`}
              </div>
            )}

            <h3 className="font-heading text-[18px] text-text-primary mb-4">Son Sync Logları</h3>
            {syncLogs.length === 0 ? (
              <p className="text-text-muted font-body text-sm">Henüz sync yapılmamış.</p>
            ) : (
              <div className="bg-white">
                {syncLogs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 border-b border-champagne-mid/30 flex items-center justify-between text-[12px] font-body">
                    <span className="text-text-muted">{new Date(log.synced_at).toLocaleString('tr-TR')}</span>
                    <span>+{log.products_added} eklendi, {log.products_updated} güncellendi</span>
                    <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>{log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
