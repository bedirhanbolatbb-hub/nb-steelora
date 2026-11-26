/**
 * Yapay zekâ ve arama tarayıcıları listesi (24 Kas 2026).
 *
 * Kaynak: ai.robots.txt projesi, robots.json
 *   https://github.com/ai-robots-txt/ai.robots.txt
 *   MIT lisansı — Copyright (c) 2024 ai.robots.txt
 * 24 Kas 2026 tarihli sürümden SEÇİLEREK alındı; çalışma anında dışarıdan
 * çekilmez. Gruplar bizim sınıflandırmamızdır. Googlebot, bingbot, YandexBot
 * ve DuckDuckBot kaynak listede yoktur (klasik arama motorları); karşılaştırma
 * için eklendi. Kaynakta işletmecisi "belirsiz" yazan adlarda, adın açıkça
 * işaret ettiği şirket yazıldı.
 *
 * Neden seçki: kaynak listede 210 ad var; "Code", "Dot", "Spider", "nbot"
 * gibi kısa adlar sıradan tarayıcı metinleriyle de eşleşir. Buraya yalnız
 * kullanıcı aracısında ayırt edici bir adla gelen tarayıcılar alındı.
 *
 * Ad, isteği yapanın kendi BEYANIDIR: adı taklit eden bir istek de sayılır.
 * Bu liste "geliyorlar mı, hangi sayfaları okuyorlar" sorusu içindir; güvenlik
 * kararı buna dayandırılmaz.
 *
 * Yeni ad eklerken: sıra önemli değil ama bir ad başka bir adın İÇİNDE
 * geçiyorsa uzun olan önce yazılır (test denetler). Ekledikten sonra
 * src/proxy.ts'teki sabit kalıbı da güncelleyin — test, olması gereken
 * metni yazdırır.
 *
 * 25 Kas 2026 — YALNIZ ASİSTAN GRUBU SAYILIYOR (bkz. SAYILAN_GRUPLAR). Liste
 * üç grubu da tutmaya devam eder: panel, önceki günlerin kayıtlarını bu
 * listedeki işletmeci adlarıyla gösterir.
 */
export type TarayiciGrubu = 'asistan' | 'egitim' | 'arama'

export type Tarayici = {
  /** Kullanıcı aracısında aranan ad (büyük-küçük harf ayrımı yapılmaz). */
  ad: string
  isletmeci: string
  grup: TarayiciGrubu
  /** İstek katmanı eşleştiricisindeki parça; yoksa adın kendisi. */
  kalip?: string
}

export const TARAYICILAR: readonly Tarayici[] = [
  // ── Asistanlar ve yapay zekâ araması: soruya yanıt verirken ya da kendi
  //    arama dizinini kurarken sayfayı okuyanlar.
  { ad: 'OAI-SearchBot', isletmeci: 'OpenAI (ChatGPT araması)', grup: 'asistan' },
  { ad: 'ChatGPT-User', isletmeci: 'OpenAI (ChatGPT, kullanıcı isteğiyle)', grup: 'asistan' },
  { ad: 'PerplexityBot', isletmeci: 'Perplexity', grup: 'asistan', kalip: 'Perplexity[Bb]ot' },
  { ad: 'Perplexity-User', isletmeci: 'Perplexity (kullanıcı isteğiyle)', grup: 'asistan' },
  { ad: 'Claude-SearchBot', isletmeci: 'Anthropic (Claude araması)', grup: 'asistan' },
  { ad: 'Claude-User', isletmeci: 'Anthropic (Claude, kullanıcı isteğiyle)', grup: 'asistan' },
  { ad: 'Claude-Web', isletmeci: 'Anthropic', grup: 'asistan' },
  { ad: 'GoogleAgent-URLContext', isletmeci: 'Google (Gemini)', grup: 'asistan' },
  { ad: 'GoogleAgent-Mariner', isletmeci: 'Google', grup: 'asistan' },
  { ad: 'Google-NotebookLM', isletmeci: 'Google (NotebookLM)', grup: 'asistan' },
  { ad: 'Gemini-Deep-Research', isletmeci: 'Google (Gemini)', grup: 'asistan' },
  { ad: 'Applebot', isletmeci: 'Apple (Siri, Spotlight)', grup: 'asistan', kalip: 'Apple[Bb]ot' },
  { ad: 'DuckAssistBot', isletmeci: 'DuckDuckGo', grup: 'asistan' },
  { ad: 'MistralAI-User', isletmeci: 'Mistral (Le Chat)', grup: 'asistan' },
  { ad: 'MistralAI-Index', isletmeci: 'Mistral (Le Chat araması)', grup: 'asistan' },
  { ad: 'meta-externalfetcher', isletmeci: 'Meta (Meta AI)', grup: 'asistan', kalip: '[Mm]eta-[Ee]xternal[Ff]etcher' },
  { ad: 'meta-webindexer', isletmeci: 'Meta (Meta AI)', grup: 'asistan' },
  { ad: 'Amzn-SearchBot', isletmeci: 'Amazon', grup: 'asistan' },
  { ad: 'Amzn-User', isletmeci: 'Amazon', grup: 'asistan' },
  { ad: 'YouBot', isletmeci: 'You.com', grup: 'asistan' },
  { ad: 'GrokBot', isletmeci: 'xAI (Grok)', grup: 'asistan' },
  { ad: 'xAI-Grok', isletmeci: 'xAI (Grok)', grup: 'asistan' },
  { ad: 'kagi-fetcher', isletmeci: 'Kagi', grup: 'asistan' },
  { ad: 'TavilyBot', isletmeci: 'Tavily', grup: 'asistan' },
  { ad: 'LinkupBot', isletmeci: 'Linkup', grup: 'asistan' },
  { ad: 'Bravebot', isletmeci: 'Brave Search', grup: 'asistan' },
  { ad: 'ExaSearchBot', isletmeci: 'Exa', grup: 'asistan' },
  { ad: 'PhindBot', isletmeci: 'Phind', grup: 'asistan' },
  { ad: 'AzureAI-SearchBot', isletmeci: 'Microsoft (Azure AI)', grup: 'asistan' },
  { ad: 'cohere-ai', isletmeci: 'Cohere', grup: 'asistan' },
  { ad: 'Kimi-SearchBot', isletmeci: 'Moonshot AI (Kimi)', grup: 'asistan' },
  { ad: 'Kimi-User', isletmeci: 'Moonshot AI (Kimi)', grup: 'asistan' },
  { ad: 'TongyiBot', isletmeci: 'Alibaba (Tongyi)', grup: 'asistan' },
  { ad: 'YiyanBot', isletmeci: 'Baidu (Ernie)', grup: 'asistan' },
  { ad: 'DoubaoBot', isletmeci: 'ByteDance (Doubao)', grup: 'asistan' },
  { ad: 'Manus-User', isletmeci: 'Manus', grup: 'asistan' },

  // ── Model eğitimi ve veri toplama.
  { ad: 'GPTBot', isletmeci: 'OpenAI', grup: 'egitim', kalip: 'GPT[Bb]ot' },
  { ad: 'ClaudeBot', isletmeci: 'Anthropic', grup: 'egitim', kalip: 'Claude[Bb]ot' },
  { ad: 'anthropic-ai', isletmeci: 'Anthropic', grup: 'egitim' },
  { ad: 'CCBot', isletmeci: 'Common Crawl', grup: 'egitim', kalip: 'CC[Bb]ot' },
  { ad: 'GoogleOther', isletmeci: 'Google', grup: 'egitim' },
  { ad: 'Google-CloudVertexBot', isletmeci: 'Google (Vertex AI)', grup: 'egitim' },
  { ad: 'Bytespider', isletmeci: 'ByteDance', grup: 'egitim' },
  { ad: 'TikTokSpider', isletmeci: 'ByteDance', grup: 'egitim' },
  { ad: 'Amazonbot', isletmeci: 'Amazon', grup: 'egitim', kalip: 'Amazon[Bb]ot' },
  { ad: 'meta-externalagent', isletmeci: 'Meta', grup: 'egitim', kalip: '[Mm]eta-[Ee]xternal[Aa]gent' },
  { ad: 'FacebookBot', isletmeci: 'Meta', grup: 'egitim', kalip: '[Ff]acebook[Bb]ot' },
  { ad: 'DeepSeekBot', isletmeci: 'DeepSeek', grup: 'egitim' },
  { ad: 'MistralAI-Training', isletmeci: 'Mistral', grup: 'egitim' },
  { ad: 'PetalBot', isletmeci: 'Huawei', grup: 'egitim' },
  { ad: 'PanguBot', isletmeci: 'Huawei', grup: 'egitim' },
  { ad: 'Diffbot', isletmeci: 'Diffbot', grup: 'egitim' },
  { ad: 'omgili', isletmeci: 'Webz.io', grup: 'egitim' },
  { ad: 'Timpibot', isletmeci: 'Timpi', grup: 'egitim' },
  { ad: 'AI2Bot', isletmeci: 'Ai2', grup: 'egitim', kalip: 'A[Ii]2Bot' },
  { ad: 'cohere-training-data-crawler', isletmeci: 'Cohere', grup: 'egitim' },
  { ad: 'YandexAdditional', isletmeci: 'Yandex (YandexGPT)', grup: 'egitim' },
  { ad: 'QwenBot', isletmeci: 'Alibaba (Qwen)', grup: 'egitim' },
  { ad: 'ERNIEBot', isletmeci: 'Baidu (Ernie)', grup: 'egitim' },
  { ad: 'MoonshotBot', isletmeci: 'Moonshot AI', grup: 'egitim' },
  { ad: 'KimiBot', isletmeci: 'Moonshot AI', grup: 'egitim' },
  { ad: 'ChatGLM-Spider', isletmeci: 'Zhipu AI', grup: 'egitim' },
  { ad: 'ImagesiftBot', isletmeci: 'ImageSift', grup: 'egitim' },

  // ── Klasik arama motorları (karşılaştırma için).
  { ad: 'Googlebot', isletmeci: 'Google', grup: 'arama', kalip: '[Gg]oogle[Bb]ot' },
  { ad: 'bingbot', isletmeci: 'Microsoft Bing', grup: 'arama', kalip: '[Bb]ing[Bb]ot' },
  { ad: 'YandexBot', isletmeci: 'Yandex', grup: 'arama', kalip: 'Yandex[Bb]ot' },
  { ad: 'DuckDuckBot', isletmeci: 'DuckDuckGo', grup: 'arama', kalip: 'DuckDuck[Bb]ot' },
]

/**
 * İstek katmanında SAYILAN gruplar (25 Kas 2026).
 *
 * İlk 16 saatin ölçümü: 400 tarayıcı isteğinin 44'ü asistan, 201'i eğitim
 * (GPTBot, PetalBot, Bytespider), 155'i arama motoruydu (Googlebot, bingbot).
 * İstek katmanı her çağrıda ~0,18 sn sunucu süresi harcıyor (soğuk açılış) —
 * günde ~2 dakika; ücretsiz planda ayda 4 saatlik sınırın dörtte biri yalnız
 * saymaya gidiyordu. Sorulan soru "asistanlar sayfalarımızı okuyor mu" olduğu
 * için yalnız asistan grubu sayılır: eğitim ve arama tarayıcılarının isteği
 * eşleştiriciden geçmez, istek katmanı onlar için HİÇ çalışmaz. Arama
 * motorlarının tarama sayısı zaten Search Console ve Bing'de var.
 *
 * Bir grubu yeniden saymak için buraya ekleyin; test, src/proxy.ts'e yazılması
 * gereken kalıbı yazdırır. Önce docs/vercel-ucretsiz-sinir.md'deki bütçeye bakın.
 */
export const SAYILAN_GRUPLAR: readonly TarayiciGrubu[] = ['asistan']

/** Bu tarayıcının isteği sayılır mı? (Kapılı yollarda katman herkes için çalışır; sayım yine yalnız bunlar için.) */
export function sayilirMi(t: Tarayici | null | undefined): t is Tarayici {
  return !!t && SAYILAN_GRUPLAR.includes(t.grup)
}

const ARAMA_DIZISI = TARAYICILAR.map((t) => ({ t, anahtar: t.ad.toLowerCase() }))

/** Kullanıcı aracısından tarayıcıyı bulur; listede yoksa null. */
export function tarayiciBul(kullaniciAraci: string | null | undefined): Tarayici | null {
  if (!kullaniciAraci) return null
  const metin = kullaniciAraci.toLowerCase()
  for (const { t, anahtar } of ARAMA_DIZISI) {
    if (metin.includes(anahtar)) return t
  }
  return null
}

/** Sayaç satırına yazılan adresin en uzun hâli. */
export const YOL_EN_FAZLA = 160

/**
 * Sayaç satırındaki adres. Sorgu ve çapa yazılmaz (kişisel veri taşıyabilir).
 * Arama motorlarında ürün sayfaları tek satırda toplanır: Google ve Bing
 * yüzlerce ürün sayfasını her gün tarar; tek tek yazmak tabloyu şişirir ve
 * bir şey söylemez. Asistan ve eğitim tarayıcılarında adres olduğu gibi kalır
 * — hangi sayfayı okudukları ölçümün kendisidir.
 */
export function yolOzeti(yol: string | null | undefined, grup: TarayiciGrubu): string {
  let y = (yol || '/').split('?')[0].split('#')[0]
  if (!y.startsWith('/')) y = `/${y}`
  if (y.length > 1 && y.endsWith('/')) y = y.slice(0, -1)
  if (grup === 'arama' && y.startsWith('/urun/')) return '/urun/*'
  return y.slice(0, YOL_EN_FAZLA)
}

/**
 * src/proxy.ts'teki eşleştiricinin kullanıcı aracısı kalıbı. Next, eşleştirici
 * değerlerini derleme anında SABİT metin olarak ister; bu yüzden aynı metin
 * orada elle de yazılıdır. Test ikisini karşılaştırır: liste değişip kalıp
 * unutulursa test kırılır. Kalıba yalnız SAYILAN gruplar girer.
 */
export function eslestiriciKalibi(): string {
  const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return `.*(?:${TARAYICILAR.filter(sayilirMi)
    .map((t) => t.kalip ?? kacis(t.ad))
    .join('|')}).*`
}
