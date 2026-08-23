/** Panel gezinmesinin tek kaynağı — kenar çubuğu, üst bar ve mobil sekmeler buradan okur. */

export type PanelLink = { href: string; label: string }
export type PanelGroup = { title: string; links: PanelLink[] }

export const PANEL_GROUPS: PanelGroup[] = [
  {
    title: 'Genel',
    links: [
      { href: '/panel', label: 'Genel Bakış' },
      { href: '/panel/analiz', label: 'Analiz' },
    ],
  },
  {
    title: 'Satış',
    links: [
      { href: '/panel/siparisler', label: 'Siparişler' },
      { href: '/panel/uyeler', label: 'Üyeler' },
      { href: '/panel/yorumlar', label: 'Yorumlar' },
    ],
  },
  {
    title: 'Katalog',
    links: [
      { href: '/panel/urunler', label: 'Ürünler' },
      { href: '/panel/koleksiyonlar', label: 'Koleksiyonlar' },
      { href: '/panel/kurasyon', label: 'Kürasyon' },
    ],
  },
  {
    title: 'Pazarlama',
    links: [
      { href: '/panel/kampanyalar', label: 'Kampanyalar' },
      { href: '/panel/bulten', label: 'Bülten' },
    ],
  },
  {
    title: 'İçerik',
    links: [
      { href: '/panel/blog', label: 'Blog' },
      { href: '/panel/site-metinleri', label: 'Site Metinleri' },
    ],
  },
  {
    title: 'Sistem',
    links: [
      { href: '/panel/senkron', label: 'Senkron' },
      { href: '/panel/stok-senkron', label: 'Stok senkronu' },
      { href: '/panel/yedekler', label: 'Yedekler' },
      { href: '/panel/ayarlar', label: 'Ayarlar' },
    ],
  },
]

/** path → başlık (üst bar ve breadcrumb için) */
export function titleFor(pathname: string): { title: string; group: string | null } {
  for (const group of PANEL_GROUPS) {
    for (const link of group.links) {
      if (link.href === pathname) {
        return { title: link.label, group: group.title === 'Genel' ? null : group.title }
      }
    }
  }
  return { title: 'Panel', group: null }
}
