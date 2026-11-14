import Navbar from '@/components/store/Navbar'
import Footer from '@/components/store/Footer'
import FloatingWhatsApp from '@/components/store/FloatingWhatsApp'
import RevealController from '@/components/motion/RevealController'
import ConsentGate from '@/components/store/ConsentGate'
import TarayiciDogrula from '@/components/store/TarayiciDogrula'
import SayfaGoruntuleme from '@/components/store/SayfaGoruntuleme'
import { getLayoutData } from '@/lib/layoutData'
import { vitrinIndirimiGetir } from '@/lib/campaigns/vitrinIndirimi'
import { KampanyaSaglayici } from '@/components/store/KampanyaContext'
import { UyelikTesvikSaglayici } from '@/components/store/UyelikTesvikContext'
import { uyelikTesvikiGetir } from '@/lib/campaigns/uyelikTesviki'
import { KadrajSaglayici } from '@/components/store/KadrajContext'
import { kadrajAyariniOku } from '@/lib/gorsel/kadrajAyari'
import { SaticiPuaniSaglayici } from '@/components/store/SaticiPuaniContext'
import { saticiPuaniOku } from '@/lib/metin/saticiPuani'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ortak vitrin verisi (banner + kupon + footer koleksiyon/sosyal) süreç içi
  // önbellekten gelir (Faz 9A) — istek yolunda kişiye özel tek iş auth kalır.
  const [veri, vitrinIndirimi, uyelikTesviki] = await Promise.all([
    getLayoutData(),
    vitrinIndirimiGetir(),
    uyelikTesvikiGetir(),
  ])

  // 14 Kas 2026: vitrin önbellekten verilir (ücretsiz plandaki sunucu süresi).
  // Bu yüzden burada istek başı hiçbir şey okunmaz: sayfa görüntüleme
  // tarayıcıdan ölçülür (SayfaGoruntuleme), hesap simgesinin hedefi tarayıcıda
  // oturum çerezine bakılarak seçilir (hooks/useOturumVar).

  return (
    // Faz 11A: sağlayıcı yalnız <main>'i sarıyordu; Navbar onun DIŞINDAydı.
    // Sepet paneli ve arama kutusu Navbar'ın içinde olduğu için ikisi de
    // kampanyayı hiç göremiyor, satırda liste fiyatını basıyordu — ürün
    // sayfası ₺314,93 derken panel ₺449,90 diyordu. Kabuğun tamamı sarıldı.
    <KampanyaSaglayici indirim={vitrinIndirimi}>
      <UyelikTesvikSaglayici tesvik={uyelikTesviki}>
      {/* Faz 35: kart görsellerinin takıya göre kadrajlanması (ayar site_content'te). */}
      <KadrajSaglayici {...kadrajAyariniOku(veri.content)}>
      {/* 8 Kas 2026: Trendyol satıcı puanı — sepet paneli, /sepet ve ödeme
          buradan okur (lib/metin/saticiPuani; panel: Site Metinleri). */}
      <SaticiPuaniSaglayici veri={saticiPuaniOku(veri.content)}>
      <Navbar
        bannerText={veri.bannerText}
        bannerColor={veri.bannerColor}
        coupon={veri.coupon}
        ilkSiparisSeridi={veri.ilkSiparis?.serit ?? null}
        koleksiyonlar={veri.collections.map((c) => ({ slug: c.slug, name: c.name }))}
      />
      <main className="flex-1">{children}</main>
      <Footer collections={veri.collections} content={veri.content} />
      <FloatingWhatsApp />
      <RevealController />
      <ConsentGate />
      <TarayiciDogrula />
      <SayfaGoruntuleme />
      </SaticiPuaniSaglayici>
      </KadrajSaglayici>
      </UyelikTesvikSaglayici>
    </KampanyaSaglayici>
  )
}
