/**
 * Gerçek çerez / yerel depolama envanteri (Faz 12 hukuki tamamlama).
 *
 * Bu liste koddan TARANARAK ve canlıda tarayıcıyla DOĞRULANARAK çıkarıldı;
 * uydurma satır yoktur. Yeni bir çerez/depolama eklenirse burası da güncellenir.
 *
 * Doğrulama notu: rıza kararı verilmeden önce sitede HİÇBİR çerez yazılmıyor
 * (canlı ölçüm). Sepet ve son görüntülenenler yalnız localStorage'da tutuluyor.
 *
 * SON DOĞRULAMA — 22 Ağustos 2026 (Faz 18), canlıda gerçek tarayıcıyla:
 *   ana sayfa ilk yükleme 189 istek → üçüncü taraf host 0, yazılan çerez 0,
 *   localStorage anahtarı 0; window.gtag / fbq / ttq / dataLayer hepsi
 *   undefined. "Reddet" sonrası tek çerez nb_consent, "Kabul et" sonrası
 *   nb_consent + nb_vid — ikisi de birinci taraf. Yani rıza bandındaki
 *   "hiçbir reklam pikseli ya da izleyici bulunmuyor" cümlesi DOĞRU.
 *
 * TUZAK: Vercel ortamında NEXT_PUBLIC_GA4_ID ve NEXT_PUBLIC_META_PIXEL_ID
 * değerleri hâlâ tanımlı ama kodda hiçbir yerde okunmuyor. Bu değişkenleri
 * bir bileşene bağlamak TEK BAŞINA yeterli değildir; piksel eklenecekse aynı
 * anda (1) buradaki envantere satır girilmeli, (2) ConsentBanner'daki
 * "Pazarlama" kategorisinin `pasif` bayrağı kaldırılıp onay kutusu
 * açılmalı, (3) piksel yalnız pazarlama rızası verildikten SONRA
 * yüklenmelidir. Aksi halde bant metni yanlışa döner ve rızasız çerez
 * yazılır (KVKK m.5).
 */

/**
 * Supabase oturum çerezinin gerçek adı: `sb-<proje-kimliği>-auth-token`.
 * Kimlik NEXT_PUBLIC_SUPABASE_URL'den türetilir (gizli değildir). Önceden
 * metinde düz `<proje>` yazıyordu; HTML'e basılırken etiket sanılıp yutuluyor
 * ve ekranda "sb--auth-token" görünüyordu.
 */
function supabaseCerezAdi(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const ref = (url.match(/https?:\/\/([^.]+)\./) || [])[1]
  return ref ? `sb-${ref}-auth-token` : 'sb-&lt;proje-kimliği&gt;-auth-token'
}

export type CerezSatiri = {
  ad: string
  tur: 'Çerez' | 'localStorage'
  taraf: 'Birinci taraf' | 'Üçüncü taraf'
  amac: string
  sure: string
  kategori: 'Zorunlu' | 'Analitik — gelişmiş' | 'Pazarlama'
  /** Yalnız belirli bir adımda yazılanlar için not. */
  kosul?: string
}

export const CEREZ_ENVANTERI: CerezSatiri[] = [
  {
    ad: 'nb-steelora-cart',
    tur: 'localStorage',
    taraf: 'Birinci taraf',
    amac: 'Sepetinizdeki ürünlerin tarayıcınızda saklanması',
    sure: 'Siz silene kadar (tarayıcıda kalır)',
    kategori: 'Zorunlu',
  },
  {
    ad: 'nb-steelora-wishlist',
    tur: 'localStorage',
    taraf: 'Birinci taraf',
    amac: 'Favori listenizin tarayıcınızda saklanması',
    sure: 'Siz silene kadar',
    kategori: 'Zorunlu',
  },
  {
    ad: 'nb-steelora-recently-viewed',
    tur: 'localStorage',
    taraf: 'Birinci taraf',
    amac: 'Son görüntülediğiniz ürünlerin listelenmesi',
    sure: 'Siz silene kadar',
    kategori: 'Zorunlu',
  },
  {
    ad: 'nb_consent',
    tur: 'Çerez',
    taraf: 'Birinci taraf',
    amac: 'Çerez tercihlerinizin hatırlanması (bu bandda verdiğiniz karar)',
    sure: '365 gün',
    kategori: 'Zorunlu',
  },
  {
    ad: supabaseCerezAdi(),
    tur: 'Çerez',
    taraf: 'Birinci taraf',
    amac: 'Üye girişi yaptığınızda oturumunuzun sürdürülmesi (Supabase kimlik doğrulama)',
    sure: 'Oturum boyunca / yenilenene kadar',
    kategori: 'Zorunlu',
    kosul: 'Yalnız üye girişi yapıldığında yazılır',
  },
  {
    ad: 'nb_vid',
    tur: 'Çerez',
    taraf: 'Birinci taraf',
    amac:
      'Tekrar gelen ziyaretçilerin ve ziyaretler arası yolculuğun anlaşılması için kalıcı ziyaretçi numarası',
    sure: '395 gün (13 ay)',
    kategori: 'Analitik — gelişmiş',
    kosul: 'YALNIZ açık rızanız varsa yazılır; rızayı geri alırsanız silinir',
  },
  {
    ad: 'iyzico ödeme çerezleri',
    tur: 'Çerez',
    taraf: 'Üçüncü taraf',
    amac:
      'Ödeme adımında 3D Secure doğrulaması ve dolandırıcılık önleme (iyzico Ödeme Hizmetleri A.Ş.)',
    sure: 'iyzico tarafından belirlenir',
    kategori: 'Zorunlu',
    kosul: 'Yalnız ödeme adımına geçtiğinizde, iyzico alan adında yazılır',
  },
]

/** Politika sayfasında basılan HTML tablosu. */
export function envanterTablosuHtml(): string {
  const satirlar = CEREZ_ENVANTERI.map(
    (c) => `<tr>
<td><code>${c.ad}</code>${c.kosul ? `<br><small>${c.kosul}</small>` : ''}</td>
<td>${c.amac}</td>
<td>${c.tur} · ${c.taraf}</td>
<td>${c.sure}</td>
<td>${c.kategori}</td>
</tr>`
  ).join('\n')

  return `
<div style="overflow-x:auto">
<table>
<thead>
<tr><th>Ad</th><th>Amaç</th><th>Tür</th><th>Süre</th><th>Kategori</th></tr>
</thead>
<tbody>
${satirlar}
</tbody>
</table>
</div>
<p><small>Bu tablo, sitenin kodundan taranarak ve tarayıcıda doğrulanarak hazırlanmıştır.
Çerez tercihinizi belirlemeden önce sitede hiçbir çerez yazılmaz.</small></p>`.trim()
}
