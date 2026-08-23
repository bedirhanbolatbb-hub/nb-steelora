import GirisFormu from './GirisFormu'

/**
 * Sunucu sarmalayıcı (Faz 27).
 *
 * CSP nonce'u yalnız DİNAMİK üretilen sayfalara işlenebiliyor. Bu sayfa
 * statik ön üretiliyordu; nonce'suz script etiketleriyle nonce'lu bir
 * politika alınca bütün script'leri engellenirdi (yerelde ölçüldü: 19-20
 * script, 0 nonce — yani giriş formu hiç çalışmazdı).
 *
 * `export const dynamic` bir 'use client' dosyasından OKUNMAZ; segment
 * ayarları sunucu bileşeninden gelmek zorunda. Form olduğu gibi
 * GirisFormu.tsx içinde duruyor.
 */
export const dynamic = 'force-dynamic'

export default function Sayfa() {
  return <GirisFormu />
}
