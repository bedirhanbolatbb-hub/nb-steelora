import { redirect } from 'next/navigation'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import PanelShell from './_components/PanelShell'

/**
 * Korumalı panel grubu. Kimlik doğrulama mevcut admin mekanizması:
 * admin_token çerezi ADMIN_SECRET_TOKEN ile karşılaştırılır. proxy.ts kenarda
 * aynı kuralı uygular — bu katman ikinci kilittir.
 */
export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminRequest())) redirect('/panel/login')

  return <PanelShell>{children}</PanelShell>
}
