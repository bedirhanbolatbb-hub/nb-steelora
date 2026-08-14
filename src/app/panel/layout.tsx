import type { Metadata } from 'next'
import './panel.css'

export const metadata: Metadata = {
  title: { default: 'Panel — NB Steelora', template: '%s — NB Steelora Panel' },
  robots: { index: false, follow: false },
}

/**
 * Panel kök yerleşimi: yalnız tema. Kimlik doğrulama (app) grubunun
 * layout'unda — /panel/login bu grubun DIŞINDA olduğu için giriş sayfası
 * çerezsiz erişilebilir kalır; koruma proxy.ts + (app)/layout çift kilidiyle.
 */
export default function PanelRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="panel-root">{children}</div>
}
