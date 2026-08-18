import { sunucuOlayi } from '@/lib/analytics/server'

/**
 * Blog rotalarının ölçüm kapısı (Faz 15).
 *
 * Blog sayfaları `(store)` route grubunun dışında durduğu için o grubun
 * layout'undaki `page_view` çağrısı buraya hiç ulaşmıyordu — blog listesi ve
 * yazı detayları ölçümde hiç görünmedi. Ölçüm burada, vitrindeki ile aynı
 * sunucu tarafı yöntemle yapılır: engelleyicilerden etkilenmez, istemciye JS
 * eklemez, `after()` sayesinde yanıtı geciktirmez.
 */
export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  await sunucuOlayi('page_view')
  return <>{children}</>
}
