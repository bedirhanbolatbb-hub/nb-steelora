/**
 * Ortak hukuki metin blokları (Faz 12 hukuki tamamlama).
 *
 * TASLAKTIR — avukat onayı bekleniyor. Sayfalarda bu not GÖSTERİLMEZ; rapora
 * ve panel uyarısına düşülür.
 *
 * Sunucu bölgeleri altyapıdan DOĞRULANMIŞTIR:
 *   - Vercel: uç sunucular fra1 (Frankfurt/AB), sunucu fonksiyonları iad1 (ABD)
 *     — canlı yanıt başlığı `x-vercel-id: fra1::iad1::…`
 *   - Supabase: ap-southeast-1 (Singapur) — proje bilgisinden okundu
 *   - Resend: ABD merkezli altyapı
 *   - Cloudflare: küresel anycast ağ (DNS/CDN)
 *   - iyzico: Türkiye (yurt içi)
 */

/** KVKK m.11 haklarının tamamı. */
export const HAKLAR_HTML = `
<h2>Haklarınız (KVKK m.11)</h2>
<p>Veri sorumlusuna başvurarak aşağıdaki haklarınızı kullanabilirsiniz:</p>
<ol>
<li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
<li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,</li>
<li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
<li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,</li>
<li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>
<li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme,</li>
<li>(5) ve (6) uyarınca yapılan işlemlerin, kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
<li>İşlenen verilerinizin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
<li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>
</ol>
`.trim()

/** Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e göre kanallar. */
export function basvuruHtml(iletisim: string, kep: string): string {
  const eposta = iletisim || 'info@nbsteelora.com'
  return `
<h2>Başvuru Usulü</h2>
<p>
Haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ
uyarınca aşağıdaki yollarla iletebilirsiniz. Başvurunuzda adınız, soyadınız, başvuru yazılıysa
imzanız, T.C. kimlik numaranız (yabancılar için uyruğu, pasaport numarası), tebligata esas
adresiniz, varsa e-posta adresiniz ve telefon numaranız ile talebinizin konusu yer almalıdır.
</p>
<ul>
<li><strong>Yazılı başvuru:</strong> Islak imzalı dilekçenizi şahsen ya da noter aracılığıyla adresimize iletebilirsiniz.</li>
${kep ? `<li><strong>KEP:</strong> Kayıtlı elektronik posta adresinizden <strong>${kep}</strong> adresine gönderebilirsiniz.</li>` : `<li><strong>KEP:</strong> Kayıtlı elektronik posta adresimiz yayımlandığında bu bölümde duyurulacaktır.</li>`}
<li><strong>Güvenli elektronik imza / mobil imza:</strong> İmzalı başvurunuzu <strong>${eposta}</strong> adresine gönderebilirsiniz.</li>
<li><strong>Sistemimizde kayıtlı e-posta:</strong> Daha önce bize bildirdiğiniz ve sistemimizde kayıtlı olan e-posta adresinizden <strong>${eposta}</strong> adresine yazabilirsiniz.</li>
</ul>
<p>
Başvurunuz, talebin niteliğine göre en kısa sürede ve <strong>en geç otuz (30) gün</strong> içinde
ücretsiz olarak sonuçlandırılır. İşlemin ayrıca bir maliyet gerektirmesi hâlinde, Kişisel Verileri
Koruma Kurulu tarafından belirlenen tarifedeki ücret talep edilebilir.
</p>
<p>
Başvurunuzun reddedilmesi, verilen yanıtı yetersiz bulmanız veya süresinde yanıt verilmemesi
hâlinde; yanıtı öğrendiğiniz tarihten itibaren otuz (30) ve her hâlde başvuru tarihinden itibaren
altmış (60) gün içinde Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz.
</p>
`.trim()
}

/**
 * Yurt dışına aktarım (KVKK m.9) — hem çerez politikasında hem aydınlatma
 * metninde aynı blok kullanılır.
 *
 * m.9 mekanizması TASLAKTA SEÇENEKLİ bırakıldı: Kurul'a bildirilmiş standart
 * sözleşme ya da taahhütname yoksa aktarım açık rızaya dayanır. BB'nin avukatı
 * hangisinin geçerli olduğunu işaretlemeli.
 */
export const YURTDISI_HTML = `
<h2>Yurt Dışına Aktarım (KVKK m.9)</h2>
<p>
Sitemizin çalışması için kullandığımız bazı hizmet sağlayıcıların sunucuları yurt dışında
bulunmaktadır. Bu nedenle aşağıdaki veriler, ilgili hizmetin sağlanabilmesi amacıyla yurt dışına
aktarılmaktadır:
</p>
<div style="overflow-x:auto">
<table>
<thead>
<tr><th>Hizmet</th><th>Amaç</th><th>Aktarılan veri</th><th>Sunucu bölgesi</th></tr>
</thead>
<tbody>
<tr>
<td>Vercel (barındırma)</td>
<td>Web sitesinin yayınlanması, sayfaların oluşturulması</td>
<td>Bağlantı verileri (IP, tarayıcı bilgisi), gezinme sırasında iletilen form ve sipariş verileri</td>
<td>Uç sunucular Frankfurt (Almanya, AB); sunucu fonksiyonları Kuzey Virginia (ABD)</td>
</tr>
<tr>
<td>Supabase (veritabanı ve dosya depolama)</td>
<td>Üyelik, sipariş, ürün, yorum ve görsel kayıtlarının saklanması</td>
<td>Kimlik, iletişim, sipariş, teslimat adresi, üyelik ve site içi ölçüm kayıtları</td>
<td>Singapur (ap-southeast-1)</td>
</tr>
<tr>
<td>Resend (e-posta gönderimi)</td>
<td>Sipariş onayı, kargo bildirimi, şifre sıfırlama ve bilgilendirme e-postaları</td>
<td>Ad soyad, e-posta adresi, sipariş numarası ve sipariş özeti</td>
<td>ABD</td>
</tr>
<tr>
<td>Cloudflare (DNS / CDN)</td>
<td>Alan adı yönlendirmesi, içerik dağıtımı ve güvenlik</td>
<td>Bağlantı verileri (IP, istek bilgileri)</td>
<td>Küresel dağıtık ağ (isteğe en yakın nokta)</td>
</tr>
</tbody>
</table>
</div>
<p>
<strong>Yurt içinde kalan aktarımlar:</strong> Ödeme işlemleri iyzico Ödeme Hizmetleri A.Ş.
(Türkiye) üzerinden yürütülür; kart bilgileriniz tarafımızca görülmez ve saklanmaz. Kargo
gönderileriniz, anlaşmalı kargo firmalarına (Türkiye) yalnız teslimat için gereken ad, adres ve
telefon bilgisiyle iletilir.
</p>
<p>
Bu aktarımlar KVKK'nın 9. maddesi çerçevesinde gerçekleştirilir. Yeterlilik kararı bulunmayan
ülkelere yapılan aktarımlarda, Kanun'un öngördüğü uygun güvencelerden biri (Kurul'a bildirilen
standart sözleşme veya taahhütname) uygulanır; böyle bir güvencenin bulunmadığı hâllerde aktarım
açık rızanıza dayanılarak yapılır. Çerez tercihlerinizde gelişmiş analitiği reddetmeniz hâlinde
kalıcı ziyaretçi numarası oluşturulmaz ve bu kapsamda aktarım yapılmaz.
</p>
`.trim()

/** Kategori bazlı hukuki sebepler. */
export const HUKUKI_SEBEPLER_HTML = `
<h2>Hukuki Sebepler</h2>
<h3>Zorunlu çerezler ve yerel depolama</h3>
<p>
Sepetiniz, oturumunuz ve tercih kaydınız; KVKK m.5/2-(c) uyarınca <strong>bir sözleşmenin
kurulması veya ifasıyla doğrudan doğruya ilgili olması</strong> ve m.5/2-(f) uyarınca
<strong>veri sorumlusunun meşru menfaati</strong> hukuki sebeplerine dayanılarak işlenir. Bu
kayıtlar olmadan sipariş verilemez; bu nedenle açık rızaya bağlı değildir.
</p>
<h3>Anonim ziyaret ölçümü</h3>
<p>
Sayfa görüntülemelerini kendi sunucumuzda sayarken tarayıcınıza çerez yazılmaz, IP adresiniz
saklanmaz ve kimliğinizi belirlemeye yarayacak bir kayıt tutulmaz. Oturum numarası, günlük olarak
değişen bir anahtarla geri döndürülemez biçimde türetilir ve ertesi gün geçersizleşir. Bu ölçüm
<strong>belirli veya belirlenebilir bir gerçek kişiyle ilişkilendirilemediğinden</strong> KVKK
anlamında kişisel veri işleme faaliyeti oluşturmaz; bu nedenle açık rıza gerektirmez.
</p>
<h3>Gelişmiş analitik</h3>
<p>
Tarayıcınıza kalıcı bir ziyaretçi numarası yazılması ve bu numara üzerinden tekrar ziyaretlerin
ilişkilendirilmesi yalnızca <strong>açık rızanıza</strong> (KVKK m.5/1) dayanır. Rızanızı
dilediğiniz an geri alabilirsiniz; geri aldığınızda numara silinir ve bu numaraya bağlı kayıtlar
anonim hâle getirilir.
</p>
<h3>Pazarlama</h3>
<p>
Sitemizde şu anda hiçbir reklam pikseli veya üçüncü taraf izleyici bulunmamaktadır. İleride
eklenmesi hâlinde bu çerezler yalnızca <strong>açık rızanızla</strong> çalıştırılacaktır.
</p>
`.trim()

/** Saklama süreleri — rıza kayıtları için somut süre. */
export const SAKLAMA_HTML = `
<h2>Saklama Süreleri</h2>
<ul>
<li><strong>Anonim ölçüm kayıtları:</strong> 13 ay; süre sonunda otomatik olarak silinir.</li>
<li><strong>Gelişmiş analitik kayıtları (ziyaretçi numarası):</strong> 13 ay; rızanızı geri
almanız hâlinde numara derhâl silinir ve kayıtlar anonim hâle getirilir.</li>
<li><strong>Çerez tercihi (rıza) kayıtları:</strong> Rızanın geri alınmasından itibaren
<strong>10 yıl</strong>. Bu süre, rızanın varlığını ispat yükümlülüğümüz nedeniyle genel
zamanaşımı süresi esas alınarak belirlenmiştir.</li>
<li><strong>Sipariş ve fatura kayıtları:</strong> Türk Ticaret Kanunu ve Vergi Usul Kanunu
uyarınca 10 yıl.</li>
<li><strong>Üyelik kayıtları:</strong> Üyeliğiniz sürdüğü sürece; üyelik sonlandırıldığında
yasal saklama yükümlülüğü bulunanlar dışındakiler silinir.</li>
</ul>
`.trim()
