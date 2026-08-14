import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import PanelShell from './_components/PanelShell'
import './panel.css'

export const metadata: Metadata = {
  title: { default: 'Panel — NB Steelora', template: '%s — NB Steelora Panel' },
  robots: { index: false, follow: false },
}

/**
 * Yeni yönetim paneli (Faz 7A). Kimlik doğrulama mevcut admin mekanizmasının
 * aynısıdır: admin_token çerezi ADMIN_SECRET_TOKEN ile karşılaştırılır
 * (lib/admin/requireAdmin). Yetkisiz istek mevcut giriş akışına gider; proxy.ts
 * de /panel'i aynı kuralla kenarda korur — bu katman ikinci kilittir.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminRequest())) redirect('/admin/login')

  return <div className="panel-root">{<PanelShell>{children}</PanelShell>}</div>
}
