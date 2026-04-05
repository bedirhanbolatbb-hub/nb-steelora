'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import HomepageEditor from './HomepageEditor'
import ContentEditor from './ContentEditor'

interface AdminDashboardProps {
  orders: any[]
  products: any[]
  campaigns: any[]
  syncLogs: any[]
  reviews: any[]
  homepageSettings: Record<string, string[]>
}

const tabs = [
  { id: 'homepage', label: '🏠 Ana Sayfa' },
  { id: 'content', label: '✏️ İçerik' },
  { id: 'orders', label: '📦 Siparişler' },
  { id: 'products', label: '🛍️ Ürünler' },
  { id: 'campaigns', label: '🎯 Kampanyalar' },
  { id: 'reviews', label: '⭐ Yorumlar' },
  { id: 'blog', label: '📝 Blog' },
  { id: 'sync', label: '🔄 Sync' },
]

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

export default function AdminDashboard({ orders, products, campaigns, syncLogs, reviews: initialReviews, homepageSettings }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('homepage')
  const [localOrders, setLocalOrders] = useState(orders)

  useEffect(() => {
    setLocalOrders(orders)
  }, [orders])
  const [localCampaigns, setLocalCampaigns] = useState(campaigns)
  const [localProducts, setLocalProducts] = useState(products)
  const [localReviews, setLocalReviews] = useState(initialReviews)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncProgress, setSyncProgress] = useState('')
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  // Products tab state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [sortField, setSortField] = useState<string>('display_title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  // (Homepage tab uses HomepageEditor component)
  // Add product form
  const [newProduct, setNewProduct] = useState({
    title: '', category: '', price: '', salePrice: '', stock: '0',
    description: '', longDescription: '', images: '', isActive: true,
  })

  // Blog state
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [blogLoaded, setBlogLoaded] = useState(false)
  const [blogForm, setBlogForm] = useState<any>(null)
  const [blogSaving, setBlogSaving] = useState(false)
  const emptyBlogForm = { id: null, title: '', slug: '', excerpt: '', content: '', cover_image: '', meta_title: '', meta_description: '', read_time: 5, published: false }

  const loadBlogPosts = async () => {
    const res = await fetch('/api/admin/blog')
    if (res.ok) { const data = await res.json(); setBlogPosts(data); setBlogLoaded(true) }
  }

  const handleBlogTabClick = () => {
    setActiveTab('blog')
    if (!blogLoaded) loadBlogPosts()
  }

  const saveBlogPost = async () => {
    if (!blogForm) return
    setBlogSaving(true)
    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogForm),
    })
    if (res.ok) {
      const saved = await res.json()
      setBlogPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [saved, ...prev]
      })
      setBlogForm(null)
    }
    setBlogSaving(false)
  }

  const deleteBlogPost = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return
    await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' })
    setBlogPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const slugify = (text: string) =>
    text.toLowerCase().replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const router = useRouter()
  const inputClass = 'w-full px-3 py-2 border border-champagne-mid bg-white font-body text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none transition-colors'

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  // ─── Orders ───
  const updateOrderStatus = async (orderId: string, status: string, tracking?: string) => {
    const body: any = { status }
    if (tracking) body.tracking_number = tracking
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let data: { error?: string } = {}
    try {
      data = await res.json()
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      alert(typeof data.error === 'string' ? data.error : 'Sipariş güncellenemedi')
      router.refresh()
      return false
    }
    router.refresh()
    return true
  }

  // ─── Sync ───
  const triggerSync = async () => {
    setSyncing(true); setSyncResult(null); setSyncProgress('')
    let page = 0, totalAdded = 0, totalUpdated = 0, totalElements = 0
    try {
      while (true) {
        setSyncProgress(`Sayfa ${page + 1} yükleniyor...`)
        const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page }) })
        const data = await res.json()
        if (data.error) { setSyncResult({ error: data.error }); break }
        totalAdded += data.added; totalUpdated += data.updated
        totalElements = data.totalElements || totalElements
        setSyncProgress(`Sayfa ${data.page + 1}/${data.totalPages} (+${totalAdded} eklendi, ${totalUpdated} güncellendi)`)
        if (data.done) {
          const activeCount = totalAdded + totalUpdated
          const passiveCount = Math.max(0, localProducts.length - activeCount)
          setSyncResult({ success: true, productsAdded: totalAdded, productsUpdated: totalUpdated, activeCount, passiveCount, totalElements })
          break
        }
        page++
      }
    } catch { setSyncResult({ error: 'Bağlantı hatası' }) }
    setSyncing(false)
    // Sayfayı yenile — ürün listesi ve sayıları güncellensin
    router.refresh()
  }

  // ─── Campaigns ───
  const [campaignForm, setCampaignForm] = useState({
    name: '', type: 'discount_code' as string, code: '', discount_type: 'percent',
    discount_value: '', min_cart_amount: '0', max_uses: '',
    banner_text: '', banner_color: '#2A1E1E', starts_at: '', ends_at: '',
    buy_quantity: '4', pay_quantity: '3',
  })
  const emptyCampaignForm = { name: '', type: 'discount_code' as string, code: '', discount_type: 'percent', discount_value: '', min_cart_amount: '0', max_uses: '', banner_text: '', banner_color: '#2A1E1E', starts_at: '', ends_at: '', buy_quantity: '4', pay_quantity: '3' }
  const startEditCampaign = (c: any) => {
    const meta = c.metadata || {}
    setCampaignForm({
      name: c.name || '', type: c.type || 'discount_code', code: c.code || '', discount_type: c.discount_type || 'percent',
      discount_value: c.discount_value?.toString() || '', min_cart_amount: c.min_cart_amount?.toString() || '0', max_uses: c.max_uses?.toString() || '',
      banner_text: c.banner_text || '', banner_color: c.banner_color || '#2A1E1E',
      starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : '', ends_at: c.ends_at ? new Date(c.ends_at).toISOString().slice(0, 16) : '',
      buy_quantity: meta.buy_quantity?.toString() || '4', pay_quantity: meta.pay_quantity?.toString() || '3',
    })
    setEditingCampaignId(c.id)
    setShowCampaignForm(true)
  }
  const saveCampaign = async () => {
    const body: any = { name: campaignForm.name, type: campaignForm.type, is_active: true, starts_at: campaignForm.starts_at || new Date().toISOString(), ends_at: campaignForm.ends_at || null }
    if (campaignForm.type === 'discount_code' || campaignForm.type === 'cart_discount') {
      body.code = campaignForm.type === 'discount_code' ? campaignForm.code.toUpperCase() : null
      body.discount_type = campaignForm.discount_type; body.discount_value = Number(campaignForm.discount_value)
      body.min_cart_amount = Number(campaignForm.min_cart_amount); body.max_uses = campaignForm.max_uses ? Number(campaignForm.max_uses) : null
    }
    if (campaignForm.type === 'free_shipping') body.min_cart_amount = Number(campaignForm.min_cart_amount)
    if (campaignForm.type === 'buy_x_get_y') { body.metadata = { buy_quantity: Number(campaignForm.buy_quantity), pay_quantity: Number(campaignForm.pay_quantity) }; body.min_cart_amount = 0 }
    if (campaignForm.type === 'banner') { body.banner_text = campaignForm.banner_text; body.banner_color = campaignForm.banner_color }

    if (editingCampaignId) {
      // Update existing
      await fetch(`/api/admin/campaigns/${editingCampaignId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setLocalCampaigns((prev) => prev.map((c) => c.id === editingCampaignId ? { ...c, ...body } : c))
    } else {
      // Create new
      const res = await fetch('/api/admin/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { const { data } = await res.json(); if (data) setLocalCampaigns((prev) => [data, ...prev]) }
    }
    setShowCampaignForm(false); setEditingCampaignId(null); setCampaignForm(emptyCampaignForm)
  }
  const toggleCampaign = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !isActive }) })
    setLocalCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !isActive } : c)))
  }
  const deleteCampaign = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return
    await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
    setLocalCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  // ─── Product Override ───
  const saveProductOverride = async () => {
    if (!editingProduct) return
    await fetch(`/api/admin/products/${editingProduct.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ override_title: editingProduct.override_title || null, custom_price: editingProduct.custom_price ? Number(editingProduct.custom_price) : null, override_description: editingProduct.override_description || null, is_featured: editingProduct.is_featured, is_active: editingProduct.is_active }) })
    setLocalProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...editingProduct } : p)))
    setEditingProduct(null)
  }

  // (Homepage functions moved to HomepageEditor)

  // ─── Add Product ───
  const saveNewProduct = async () => {
    const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct) })
    if (res.ok) {
      const { data } = await res.json()
      if (data) setLocalProducts((prev) => [data, ...prev])
      setShowAddProduct(false)
      setNewProduct({ title: '', category: '', price: '', salePrice: '', stock: '0', description: '', longDescription: '', images: '', isActive: true })
    }
  }

  // ─── Computed ───
  // ─── Sorting & Inline Edit ───
  const toggleSort = (field: string) => {
    if (sortField === field) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }
  const sortIcon = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const saveInlineEdit = async (productId: string, field: string, value: string) => {
    const update: any = {}
    if (field === 'custom_price') update.custom_price = value ? Number(value) : null
    else if (field === 'note') update.note = value || null
    await fetch(`/api/admin/products/${productId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) })
    setLocalProducts((prev: any[]) => prev.map((p: any) => p.id === productId ? { ...p, ...update } : p))
    setEditingCell(null)
  }

  const pendingCount = localOrders.filter((o) => o.status === 'pending').length
  const categories = localProducts.reduce((acc: Record<string, number>, p: any) => {
    const cat = p.trendyol_category || 'Kategorisiz'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const categoryList = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const filteredProducts = localProducts.filter((p: any) => {
    if (selectedCategory && (p.trendyol_category || 'Kategorisiz') !== selectedCategory) return false
    if (productSearch) {
      const q = productSearch.toLowerCase()
      if (!p.display_title?.toLowerCase().includes(q) && !(p.trendyol_barcode || '').toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a: any, b: any) => {
    let av: any, bv: any
    if (sortField === 'price') { av = a.custom_price ?? a.display_price ?? 0; bv = b.custom_price ?? b.display_price ?? 0 }
    else if (sortField === 'trendyol_stock') { av = a.trendyol_stock ?? 0; bv = b.trendyol_stock ?? 0 }
    else if (sortField === 'sales_count') { av = a.sales_count ?? 0; bv = b.sales_count ?? 0 }
    else if (sortField === 'trendyol_barcode') { av = a.trendyol_barcode || ''; bv = b.trendyol_barcode || '' }
    else { av = a.display_title || ''; bv = b.display_title || '' }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? av - bv : bv - av
  })
  return (
    <div className="min-h-screen bg-champagne flex">
      {/* Sidebar */}
      <aside className="w-56 bg-dark-mid text-champagne shrink-0 flex flex-col">
        <div className="p-5 border-b border-champagne-mid/10">
          <h1 className="font-heading text-[18px] font-light tracking-wider">NB Steelora</h1>
          <p className="text-[9px] text-text-muted uppercase tracking-widest mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => tab.id === 'blog' ? handleBlogTabClick() : setActiveTab(tab.id)}
              className={`w-full text-left px-5 py-3 text-[12px] font-body transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-gold/20 text-gold' : 'text-champagne-mid/70 hover:text-champagne hover:bg-champagne-mid/5'}`}>
              {tab.label}
              {tab.id === 'orders' && pendingCount > 0 && <span className="ml-auto bg-gold text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center">{pendingCount}</span>}
              {tab.id === 'products' && <span className="ml-auto text-[10px] text-text-muted">{localProducts.length}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-champagne-mid/10">
          <button onClick={handleLogout} className="w-full text-[11px] text-text-muted hover:text-gold transition-colors font-body uppercase tracking-wider">Çıkış Yap</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">

        {/* ═══ HOMEPAGE ═══ */}
        {activeTab === 'homepage' && (
          <HomepageEditor products={localProducts} settings={homepageSettings} />
        )}

        {/* ═══ CONTENT ═══ */}
        {activeTab === 'content' && <ContentEditor />}

        {/* ═══ ORDERS ═══ */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="font-heading text-[24px] text-text-primary mb-6">Siparişler</h2>
            {localOrders.length === 0 ? <p className="text-text-muted font-body text-sm">Henüz sipariş yok.</p> : (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-[12px] font-body">
                  <thead><tr className="border-b border-champagne-mid text-text-muted uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Sipariş No</th><th className="text-left px-4 py-3">Tarih</th><th className="text-left px-4 py-3">Müşteri</th><th className="text-right px-4 py-3">Toplam</th><th className="text-center px-4 py-3">Durum</th><th className="text-center px-4 py-3">İşlem</th>
                  </tr></thead>
                  <tbody>{localOrders.map((order) => (
                    <tr key={order.id} className="border-b border-champagne-mid/30 hover:bg-champagne/50">
                      <td className="px-4 py-3 font-medium">{order.order_number}</td>
                      <td className="px-4 py-3 text-text-muted">{new Date(order.created_at).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3">{order.guest_email || '-'}</td>
                      <td className="px-4 py-3 text-right text-gold font-medium">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-[10px] ${statusColors[order.status] || 'bg-gray-100'}`}>{statusLabels[order.status] || order.status}</span></td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={order.status}
                          onChange={async (e) => {
                            const v = e.target.value
                            if (v === 'shipped') {
                              setShippingOrderId(order.id)
                              setTrackingNumber(order.tracking_number || '')
                              return
                            }
                            await updateOrderStatus(order.id, v)
                          }}
                          className="text-[11px] border border-champagne-mid px-2 py-1 rounded bg-white focus:outline-none"
                        >
                          <option value="pending">Bekliyor</option>
                          <option value="paid">Ödendi</option>
                          <option value="preparing">Hazırlanıyor</option>
                          <option value="shipped">Kargoda</option>
                          <option value="delivered">Teslim Edildi</option>
                          <option value="cancelled">İptal</option>
                        </select>
                        {shippingOrderId === order.id && (
                          <div className="mt-2 flex gap-1">
                            <input type="text" placeholder="Takip No" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="text-[11px] border border-champagne-mid px-2 py-1 rounded bg-white focus:outline-none w-28" />
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await updateOrderStatus(order.id, 'shipped', trackingNumber)
                                if (ok) {
                                  setShippingOrderId(null)
                                  setTrackingNumber('')
                                }
                              }}
                              className="text-[10px] bg-gold text-white px-2 py-1 rounded hover:bg-gold-light transition-colors"
                            >
                              Gönder
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ PRODUCTS ═══ */}
        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-[24px] text-text-primary">
                {selectedCategory ? (
                  <><button onClick={() => setSelectedCategory(null)} className="text-gold hover:text-gold-light mr-2">← </button>{selectedCategory}</>
                ) : showAllProducts ? (
                  <><button onClick={() => setShowAllProducts(false)} className="text-gold hover:text-gold-light mr-2">← </button>Tüm Ürünler</>
                ) : 'Ürünler'}
              </h2>
              <div className="flex gap-2">
                <input type="text" placeholder="Ürün ara..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className={`${inputClass} w-48`} />
                <button onClick={() => setShowAddProduct(!showAddProduct)} className="px-4 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors whitespace-nowrap">
                  {showAddProduct ? 'İptal' : '+ Ürün Ekle'}
                </button>
              </div>
            </div>

            {/* Add Product Form */}
            {showAddProduct && (
              <div className="bg-white p-6 mb-6 space-y-3">
                <h3 className="font-heading text-[18px] mb-2">Manuel Ürün Ekle</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Ürün Adı *" value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} />
                  <input className={inputClass} placeholder="Kategori" list="cat-list" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
                  <datalist id="cat-list">{categoryList.map(([cat]) => <option key={cat} value={cat} />)}</datalist>
                  <input className={inputClass} placeholder="Fiyat (₺) *" type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                  <input className={inputClass} placeholder="İndirimli Fiyat (opsiyonel)" type="number" value={newProduct.salePrice} onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })} />
                  <input className={inputClass} placeholder="Stok Adedi" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
                  <input className={inputClass} placeholder="Kısa Açıklama" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                </div>
                <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Uzun Açıklama" value={newProduct.longDescription} onChange={(e) => setNewProduct({ ...newProduct, longDescription: e.target.value })} />
                <input className={inputClass} placeholder="Görsel URL'leri (virgülle ayrılmış)" value={newProduct.images} onChange={(e) => setNewProduct({ ...newProduct, images: e.target.value })} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[12px] font-body"><input type="checkbox" checked={newProduct.isActive} onChange={(e) => setNewProduct({ ...newProduct, isActive: e.target.checked })} className="accent-gold" /> Aktif</label>
                  <button onClick={saveNewProduct} disabled={!newProduct.title || !newProduct.price} className="px-6 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50">Kaydet</button>
                </div>
              </div>
            )}

            {/* Category cards (when no category selected) */}
            {!selectedCategory && !showAllProducts && !productSearch && (
              <div className="mb-4">
                <button onClick={() => setShowAllProducts(true)} className="w-full bg-white p-4 text-center border border-champagne-mid hover:border-gold transition-colors text-[13px] font-body text-gold font-medium">
                  Tüm Ürünleri Göster ({localProducts.length})
                </button>
              </div>
            )}
            {!selectedCategory && !showAllProducts && !productSearch && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {categoryList.map(([cat, count]) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className="bg-white p-4 text-left hover:border-gold border border-champagne-mid transition-colors">
                    <p className="text-[13px] font-body font-medium text-text-primary">{cat}</p>
                    <p className="text-[11px] font-body text-text-muted mt-1">{count} ürün</p>
                  </button>
                ))}
              </div>
            )}

            {/* Product table */}
            {(selectedCategory || showAllProducts || productSearch) && filteredProducts.length > 0 && (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-[11px] font-body">
                  <thead><tr className="border-b border-champagne-mid text-text-muted uppercase tracking-wider text-[9px]">
                    <th className="text-left px-3 py-2 cursor-pointer hover:text-gold" onClick={() => toggleSort('display_title')}>Ürün{sortIcon('display_title')}</th>
                    <th className="text-left px-3 py-2 cursor-pointer hover:text-gold" onClick={() => toggleSort('trendyol_barcode')}>Barkod{sortIcon('trendyol_barcode')}</th>
                    <th className="text-right px-3 py-2 cursor-pointer hover:text-gold" onClick={() => toggleSort('price')}>Fiyat{sortIcon('price')}</th>
                    <th className="text-left px-3 py-2">Not</th>
                    <th className="text-center px-3 py-2 cursor-pointer hover:text-gold" onClick={() => toggleSort('trendyol_stock')}>Stok{sortIcon('trendyol_stock')}</th>
                    <th className="text-center px-3 py-2 cursor-pointer hover:text-gold" onClick={() => toggleSort('sales_count')}>Satış{sortIcon('sales_count')}</th>
                    <th className="text-center px-3 py-2">Durum</th>
                    <th className="text-center px-3 py-2">İşlem</th>
                  </tr></thead>
                  <tbody>{filteredProducts.map((p: any) => (
                    <tr key={p.id} className="border-b border-champagne-mid/30 hover:bg-champagne/50">
                      <td className="px-3 py-2"><div className="flex items-center gap-2">
                        <div className="w-8 h-10 bg-champagne-dark shrink-0 overflow-hidden">{p.display_images?.[0] && <img src={p.display_images[0]} alt="" className="w-full h-full object-cover" />}</div>
                        <span className="font-medium truncate max-w-[160px]">{p.display_title}</span>
                      </div></td>
                      <td className="px-3 py-2 text-text-muted text-[10px]">{p.trendyol_barcode || '-'}</td>
                      <td className="px-3 py-2 text-right">
                        {editingCell?.id === p.id && editingCell?.field === 'custom_price' ? (
                          <input type="number" autoFocus value={editingValue} onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => saveInlineEdit(p.id, 'custom_price', editingValue)}
                            onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(p.id, 'custom_price', editingValue)}
                            className="w-20 text-right border border-gold px-1 py-0.5 text-[11px] focus:outline-none" />
                        ) : (
                          <span className={`cursor-pointer hover:text-gold ${p.custom_price ? 'text-gold font-medium' : 'text-text-primary'}`}
                            onClick={() => { setEditingCell({ id: p.id, field: 'custom_price' }); setEditingValue(p.custom_price?.toString() || p.display_price?.toString() || '') }}>
                            {formatPrice(p.custom_price ?? p.display_price)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingCell?.id === p.id && editingCell?.field === 'note' ? (
                          <input type="text" autoFocus value={editingValue} onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => saveInlineEdit(p.id, 'note', editingValue)}
                            onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(p.id, 'note', editingValue)}
                            className="w-24 border border-gold px-1 py-0.5 text-[11px] focus:outline-none" />
                        ) : (
                          <span className="cursor-pointer text-text-muted hover:text-gold text-[10px] truncate block max-w-[100px]"
                            onClick={() => { setEditingCell({ id: p.id, field: 'note' }); setEditingValue(p.note || '') }}>
                            {p.note || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{p.trendyol_stock}</td>
                      <td className="px-3 py-2 text-center text-text-muted">{p.sales_count || 0}</td>
                      <td className="px-3 py-2 text-center">
                        {p.is_active ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Aktif</span> : <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pasif</span>}
                      </td>
                      <td className="px-3 py-2 text-center"><button onClick={() => setEditingProduct({ ...p })} className="text-[10px] text-gold hover:text-gold-light transition-colors uppercase tracking-wider">Düzenle</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {(selectedCategory || showAllProducts || productSearch) && filteredProducts.length === 0 && <p className="text-text-muted font-body text-sm">Ürün bulunamadı.</p>}

            {/* Edit Modal */}
            {editingProduct && (
              <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md p-6 space-y-4">
                  <h3 className="font-heading text-[20px]">Ürün Düzenle</h3>
                  <p className="text-[11px] text-text-muted font-body">Trendyol: {editingProduct.trendyol_title}</p>
                  <input className={inputClass} placeholder="Override Başlık" value={editingProduct.override_title || ''} onChange={(e) => setEditingProduct({ ...editingProduct, override_title: e.target.value })} />
                  <input className={inputClass} placeholder="Fiyat (boş = Trendyol fiyatı)" type="number" value={editingProduct.custom_price || ''} onChange={(e) => setEditingProduct({ ...editingProduct, custom_price: e.target.value })} />
                  <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Override Açıklama" value={editingProduct.override_description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, override_description: e.target.value })} />
                  <label className="flex items-center gap-2 text-[12px] font-body"><input type="checkbox" checked={editingProduct.is_featured} onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })} /> Öne Çıkar</label>
                  <label className="flex items-center gap-2 text-[12px] font-body"><input type="checkbox" checked={editingProduct.is_active} onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })} /> Aktif</label>
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
              <button onClick={() => { setShowCampaignForm(!showCampaignForm); if (showCampaignForm) { setEditingCampaignId(null); setCampaignForm(emptyCampaignForm) } }} className="px-4 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors">{showCampaignForm ? 'İptal' : '+ Yeni Kampanya'}</button>
            </div>
            {showCampaignForm && (
              <div className="bg-white p-6 mb-6 space-y-4">
                <input className={inputClass} placeholder="Kampanya Adı *" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
                <select className={inputClass} value={campaignForm.type} onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}>
                  <option value="discount_code">İndirim Kodu</option><option value="cart_discount">Sepet İndirimi</option><option value="free_shipping">Ücretsiz Kargo</option><option value="buy_x_get_y">X Al Y Öde</option><option value="banner">Duyuru Banner</option>
                </select>
                {(campaignForm.type === 'discount_code' || campaignForm.type === 'cart_discount') && (<>
                  {campaignForm.type === 'discount_code' && <input className={inputClass} placeholder="Kod (ör: YAZ2026)" value={campaignForm.code} onChange={(e) => setCampaignForm({ ...campaignForm, code: e.target.value.toUpperCase() })} />}
                  <div className="grid grid-cols-2 gap-3">
                    <select className={inputClass} value={campaignForm.discount_type} onChange={(e) => setCampaignForm({ ...campaignForm, discount_type: e.target.value })}><option value="percent">% İndirim</option><option value="fixed">Sabit TL</option></select>
                    <input className={inputClass} placeholder="Miktar" type="number" value={campaignForm.discount_value} onChange={(e) => setCampaignForm({ ...campaignForm, discount_value: e.target.value })} />
                  </div>
                  <input className={inputClass} placeholder="Min. Sepet Tutarı (₺)" type="number" value={campaignForm.min_cart_amount} onChange={(e) => setCampaignForm({ ...campaignForm, min_cart_amount: e.target.value })} />
                  {campaignForm.type === 'discount_code' && <input className={inputClass} placeholder="Max Kullanım (boş = sınırsız)" type="number" value={campaignForm.max_uses} onChange={(e) => setCampaignForm({ ...campaignForm, max_uses: e.target.value })} />}
                </>)}
                {campaignForm.type === 'free_shipping' && <input className={inputClass} placeholder="Min. Sepet Tutarı (0 = her zaman)" type="number" value={campaignForm.min_cart_amount} onChange={(e) => setCampaignForm({ ...campaignForm, min_cart_amount: e.target.value })} />}
                {campaignForm.type === 'buy_x_get_y' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input className={inputClass} placeholder="Kaç ürün alınsın? (ör: 4)" type="number" value={campaignForm.buy_quantity} onChange={(e) => setCampaignForm({ ...campaignForm, buy_quantity: e.target.value })} />
                    <input className={inputClass} placeholder="Kaç ürün ödensin? (ör: 3)" type="number" value={campaignForm.pay_quantity} onChange={(e) => setCampaignForm({ ...campaignForm, pay_quantity: e.target.value })} />
                  </div>
                )}
                {campaignForm.type === 'banner' && (<><input className={inputClass} placeholder="Banner Metni" value={campaignForm.banner_text} onChange={(e) => setCampaignForm({ ...campaignForm, banner_text: e.target.value })} /><div className="flex items-center gap-3"><label className="text-[12px] font-body text-text-muted">Renk:</label><input type="color" value={campaignForm.banner_color} onChange={(e) => setCampaignForm({ ...campaignForm, banner_color: e.target.value })} className="w-10 h-8 border-0 cursor-pointer" /></div></>)}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-body text-text-muted uppercase tracking-wider">Başlangıç</label><input className={inputClass} type="datetime-local" value={campaignForm.starts_at} onChange={(e) => setCampaignForm({ ...campaignForm, starts_at: e.target.value })} /></div>
                  <div><label className="text-[10px] font-body text-text-muted uppercase tracking-wider">Bitiş</label><input className={inputClass} type="datetime-local" value={campaignForm.ends_at} onChange={(e) => setCampaignForm({ ...campaignForm, ends_at: e.target.value })} /></div>
                </div>
                <button onClick={saveCampaign} disabled={!campaignForm.name} className="w-full py-2.5 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50">{editingCampaignId ? 'Güncelle' : 'Kampanya Oluştur'}</button>
              </div>
            )}
            <div className="space-y-3">{localCampaigns.length === 0 ? <p className="text-text-muted font-body text-sm">Henüz kampanya yok.</p> : localCampaigns.map((c: any) => (
              <div key={c.id} className="bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="font-body text-[13px] font-medium text-text-primary">{c.name}</span><span className="text-[9px] bg-champagne-dark px-1.5 py-0.5 rounded text-text-muted uppercase">{c.type.replace('_', ' ')}</span>{!c.is_active && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pasif</span>}</div>
                  <div className="text-[11px] text-text-muted font-body mt-1 space-x-3">{c.code && <span>Kod: <strong>{c.code}</strong></span>}{c.discount_value && <span>{c.discount_type === 'percent' ? `%${c.discount_value}` : `${c.discount_value}₺`}</span>}{c.banner_text && <span>{c.banner_text}</span>}{c.max_uses && <span>Kullanım: {c.used_count}/{c.max_uses}</span>}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleCampaign(c.id, c.is_active)} className={`text-[10px] px-2 py-1 rounded transition-colors ${c.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.is_active ? 'Aktif' : 'Pasif'}</button>
                  <button onClick={() => startEditCampaign(c)} className="text-[10px] text-gold hover:text-gold-light transition-colors px-2 py-1">Düzenle</button>
                  <button onClick={() => deleteCampaign(c.id)} className="text-[10px] text-red-400 hover:text-red-600 transition-colors px-2 py-1">Sil</button>
                </div>
              </div>
            ))}</div>
          </div>
        )}

        {/* ═══ REVIEWS ═══ */}
        {activeTab === 'reviews' && (
          <div>
            <h2 className="font-heading text-[24px] text-text-primary mb-6">Yorumlar</h2>
            {localReviews.length === 0 ? <p className="text-text-muted font-body text-sm">Henüz yorum yok.</p> : (
              <div className="space-y-3">{localReviews.map((review: any) => (
                <div key={review.id} className="bg-white p-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">{[1,2,3,4,5].map((s) => <svg key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-gold' : 'fill-champagne-mid'}`} viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>)}</div>
                      <span className="text-[11px] text-text-muted font-body">{review.guest_name || 'Üye'} · {new Date(review.created_at).toLocaleDateString('tr-TR')}</span>
                      {!review.is_approved && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">Bekliyor</span>}
                    </div>
                    {review.title && <p className="text-[12px] font-body font-medium text-text-primary">{review.title}</p>}
                    <p className="text-[12px] font-body text-text-secondary truncate">{review.body}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {!review.is_approved && <button onClick={async () => { await fetch(`/api/admin/campaigns/${review.id}?type=review`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_approved: true }) }); setLocalReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, is_approved: true } : r)) }} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors">Onayla</button>}
                    <button onClick={async () => { if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return; await fetch(`/api/admin/campaigns/${review.id}?type=review`, { method: 'DELETE' }); setLocalReviews((prev) => prev.filter((r) => r.id !== review.id)) }} className="text-[10px] text-red-400 hover:text-red-600 transition-colors px-2 py-1">Sil</button>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        )}

        {/* ═══ BLOG ═══ */}
        {activeTab === 'blog' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-[24px] text-text-primary">Blog Yazıları</h2>
              <button
                onClick={() => setBlogForm({ ...emptyBlogForm })}
                className="px-4 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors"
              >
                + Yeni Yazı
              </button>
            </div>

            {/* Post list */}
            {!blogLoaded ? (
              <p className="text-text-muted font-body text-sm">Yükleniyor...</p>
            ) : blogPosts.length === 0 ? (
              <p className="text-text-muted font-body text-sm">Henüz yazı yok.</p>
            ) : (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-[12px] font-body">
                  <thead>
                    <tr className="border-b border-champagne-mid bg-champagne text-text-muted uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3 text-left">Başlık</th>
                      <th className="px-4 py-3 text-left">Slug</th>
                      <th className="px-4 py-3 text-center">Durum</th>
                      <th className="px-4 py-3 text-left">Tarih</th>
                      <th className="px-4 py-3 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogPosts.map((post: any) => (
                      <tr key={post.id} className="border-b border-champagne-mid/30 hover:bg-champagne/50">
                        <td className="px-4 py-3 text-text-primary max-w-[240px] truncate">{post.title}</td>
                        <td className="px-4 py-3 text-text-muted max-w-[160px] truncate">{post.slug}</td>
                        <td className="px-4 py-3 text-center">
                          {post.published
                            ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Yayında</span>
                            : <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Taslak</span>}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {post.published_at ? new Date(post.published_at).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-3">
                          <button
                            onClick={() => setBlogForm({ ...post })}
                            className="text-[10px] text-gold hover:text-gold-light transition-colors uppercase tracking-wider"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => deleteBlogPost(post.id)}
                            className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Blog form modal */}
            {blogForm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
                <div className="bg-white w-full max-w-2xl p-6 space-y-4 my-8">
                  <h3 className="font-heading text-[20px]">{blogForm.id ? 'Yazıyı Düzenle' : 'Yeni Yazı'}</h3>
                  <input
                    className={inputClass}
                    placeholder="Başlık"
                    value={blogForm.title}
                    onChange={(e) => {
                      const title = e.target.value
                      setBlogForm((f: any) => ({ ...f, title, slug: f.id ? f.slug : slugify(title) }))
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      placeholder="slug (otomatik)"
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm((f: any) => ({ ...f, slug: e.target.value }))}
                    />
                    <input
                      className={`${inputClass} w-28 shrink-0`}
                      type="number"
                      placeholder="Okuma dk"
                      value={blogForm.read_time}
                      onChange={(e) => setBlogForm((f: any) => ({ ...f, read_time: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="Kısa açıklama (excerpt)"
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm((f: any) => ({ ...f, excerpt: e.target.value }))}
                  />
                  <textarea
                    className={`${inputClass} resize-y`}
                    rows={12}
                    placeholder="İçerik (HTML)"
                    value={blogForm.content}
                    onChange={(e) => setBlogForm((f: any) => ({ ...f, content: e.target.value }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="Kapak görseli URL"
                    value={blogForm.cover_image || ''}
                    onChange={(e) => setBlogForm((f: any) => ({ ...f, cover_image: e.target.value }))}
                  />
                  <input
                    className={inputClass}
                    placeholder="Meta başlık (SEO)"
                    value={blogForm.meta_title || ''}
                    onChange={(e) => setBlogForm((f: any) => ({ ...f, meta_title: e.target.value }))}
                  />
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={2}
                    placeholder="Meta açıklama (SEO)"
                    value={blogForm.meta_description || ''}
                    onChange={(e) => setBlogForm((f: any) => ({ ...f, meta_description: e.target.value }))}
                  />
                  <label className="flex items-center gap-2 text-[12px] font-body">
                    <input
                      type="checkbox"
                      checked={blogForm.published}
                      onChange={(e) => setBlogForm((f: any) => ({ ...f, published: e.target.checked }))}
                    />
                    Yayınla
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveBlogPost}
                      disabled={blogSaving}
                      className="flex-1 py-2 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50"
                    >
                      {blogSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                      onClick={() => setBlogForm(null)}
                      className="flex-1 py-2 border border-champagne-mid text-text-muted text-[11px] uppercase tracking-wider hover:border-gold transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SYNC ═══ */}
        {activeTab === 'sync' && (
          <div>
            <h2 className="font-heading text-[24px] text-text-primary mb-6">Trendyol Sync</h2>
            <button onClick={triggerSync} disabled={syncing} className="px-6 py-3 bg-gold text-white text-[11px] uppercase tracking-wider hover:bg-gold-light transition-colors disabled:opacity-50 mb-6">{syncing ? 'Sync yapılıyor...' : 'Manuel Sync Başlat'}</button>
            {syncing && syncProgress && <div className="p-4 mb-4 text-[12px] font-body bg-blue-50 text-blue-800">⏳ {syncProgress}</div>}
            {syncResult && <div className={`p-4 mb-6 text-[12px] font-body ${syncResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{syncResult.success ? `✓ ${syncResult.productsAdded} ürün eklendi, ${syncResult.productsUpdated} güncellendi · ${syncResult.activeCount || 0} aktif, ${syncResult.passiveCount || 0} pasife çekildi` : `✗ Hata: ${syncResult.error}`}</div>}
            <h3 className="font-heading text-[18px] text-text-primary mb-4">Son Sync Logları</h3>
            {syncLogs.length === 0 ? <p className="text-text-muted font-body text-sm">Henüz sync yapılmamış.</p> : (
              <div className="bg-white">{syncLogs.map((log: any) => (
                <div key={log.id} className="px-4 py-3 border-b border-champagne-mid/30 flex items-center justify-between text-[12px] font-body">
                  <span className="text-text-muted">{new Date(log.synced_at).toLocaleString('tr-TR')}</span>
                  <span>+{log.products_added} eklendi, {log.products_updated} güncellendi</span>
                  <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>{log.status}</span>
                </div>
              ))}</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
