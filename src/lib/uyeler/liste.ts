import { createServiceClient } from '@/lib/supabase/service'

/**
 * Panel üye listesi (Faz 23-B).
 *
 * Üyeler `auth.users` içinde durur; ayrı bir `profiles` tablosu yok. Bu yüzden
 * okuma admin API'siyle yapılır ve service anahtarı ASLA istemciye geçmez —
 * bu modül yalnız sunucuda çalışır.
 */

export type UyeSatiri = {
  id: string
  /** Panelde basılan maskeli adres. */
  eposta: string
  /** Ham adres yalnız arama/eşleştirme için; ekrana basılmaz. */
  epostaTam: string
  ad: string | null
  kayit: string
  onayli: boolean
  sonGiris: string | null
  bugunKatildi: boolean
}

/**
 * E-posta maskesi.
 *
 * Panelde tam adresi göstermek, ekran paylaşımında ya da omuz üstünden bakışta
 * müşteri adresini ifşa eder; kimliği ayırt etmeye yetecek kadarı bırakılır.
 * `celiknalan72@gmail.com` → `cel•••••72@gmail.com`
 */
export function epostaMaskele(eposta: string): string {
  const [ad, alan] = eposta.split('@')
  if (!alan) return '•••'
  if (ad.length <= 4) return `${ad.slice(0, 1)}•••@${alan}`
  // Nokta sayısı SABİT: adres uzunluğunu da sızdırmanın anlamı yok.
  return `${ad.slice(0, 3)}•••••${ad.slice(-2)}@${alan}`
}

const ISTANBUL = 'Europe/Istanbul'
const gunAnahtari = (t: string | Date) =>
  new Date(t).toLocaleDateString('sv-SE', { timeZone: ISTANBUL })

export async function uyeleriGetir(): Promise<UyeSatiri[]> {
  const supabase = createServiceClient()
  const bugun = gunAnahtari(new Date())
  const hepsi: UyeSatiri[] = []

  // Admin API sayfalı çalışır; 1000 üyeye kadar okunur.
  for (let sayfa = 1; sayfa <= 10; sayfa++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: sayfa, perPage: 100 })
    if (error || !data?.users?.length) break
    for (const u of data.users) {
      const eposta = u.email ?? ''
      hepsi.push({
        id: u.id,
        eposta: eposta ? epostaMaskele(eposta) : '—',
        epostaTam: eposta,
        ad: (u.user_metadata as any)?.full_name ?? null,
        kayit: u.created_at,
        onayli: Boolean(u.email_confirmed_at),
        sonGiris: u.last_sign_in_at ?? null,
        bugunKatildi: gunAnahtari(u.created_at) === bugun,
      })
    }
    if (data.users.length < 100) break
  }

  return hepsi.sort((a, b) => new Date(b.kayit).getTime() - new Date(a.kayit).getTime())
}

export async function uyeGetir(id: string): Promise<UyeSatiri | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase.auth.admin.getUserById(id)
  if (error || !data?.user) return null
  const u = data.user
  const eposta = u.email ?? ''
  return {
    id: u.id,
    eposta: eposta ? epostaMaskele(eposta) : '—',
    epostaTam: eposta,
    ad: (u.user_metadata as any)?.full_name ?? null,
    kayit: u.created_at,
    onayli: Boolean(u.email_confirmed_at),
    sonGiris: u.last_sign_in_at ?? null,
    bugunKatildi: gunAnahtari(u.created_at) === gunAnahtari(new Date()),
  }
}
