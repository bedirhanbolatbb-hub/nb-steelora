import Link from 'next/link'
import DogrulamaTekrarGonder from '@/components/store/DogrulamaTekrarGonder'

/**
 * E-posta bağlantısı işlenemediğinde açılan ekran.
 *
 * Tek bir "geçersiz link" metni yerine duruma göre ne yapılacağını söyler;
 * özellikle `kayit-farkli-cihaz` durumunda hesap ASLINDA doğrulanmıştır
 * (Supabase'in verify ucu bağlantıyı tüketirken doğrular), yalnız oturum
 * kurulamamıştır — kullanıcıyı hata sanıp kaydı tekrarlamaya itmemek gerekir.
 */
type HataIcerigi = {
  baslik: string
  metin: string
  birincil: { yazi: string; yol: string }
  tekrarGonder?: boolean
}

const DURUMLAR: Record<string, HataIcerigi> = {
  'kayit-farkli-cihaz': {
    baslik: 'E-postanız doğrulandı',
    metin:
      'Bağlantıyı, kaydı başlattığınız tarayıcıdan farklı bir yerde açtığınız için oturum burada ' +
      'kendiliğinden açılamadı. Hesabınız doğrulandı — şifrenizle giriş yapabilirsiniz.',
    birincil: { yazi: 'Giriş Yap', yol: '/giris' },
  },
  'sifre-farkli-cihaz': {
    baslik: 'Bağlantı bu cihazda açılamadı',
    metin:
      'Şifre sıfırlama bağlantısı, isteği başlattığınız tarayıcıda açılmalı. Bağlantıyı o ' +
      'tarayıcıda açın ya da buradan yeni bir bağlantı isteyin.',
    birincil: { yazi: 'Yeni Bağlantı İste', yol: '/sifremi-unuttum' },
  },
  'sifre-baglanti-gecersiz': {
    baslik: 'Bağlantının süresi dolmuş',
    metin:
      'Şifre sıfırlama bağlantıları bir kez kullanılır ve kısa süre sonra geçersizleşir. ' +
      'Yeni bir bağlantı isteyebilirsiniz.',
    birincil: { yazi: 'Yeni Bağlantı İste', yol: '/sifremi-unuttum' },
  },
  'kayit-baglanti-gecersiz': {
    baslik: 'Bağlantının süresi dolmuş',
    metin:
      'Doğrulama bağlantıları bir kez kullanılır ve kısa süre sonra geçersizleşir. Hesabınız ' +
      'daha önce doğrulandıysa doğrudan giriş yapabilirsiniz; yoksa yeni bir bağlantı isteyin.',
    birincil: { yazi: 'Giriş Yap', yol: '/giris' },
    tekrarGonder: true,
  },
}

const VARSAYILAN: HataIcerigi = {
  baslik: 'Bağlantı işlenemedi',
  metin:
    'E-posta bağlantısı geçersiz ya da süresi dolmuş olabilir. Giriş yapmayı deneyin veya yeni ' +
    'bir bağlantı isteyin.',
  birincil: { yazi: 'Giriş Yap', yol: '/giris' },
  tekrarGonder: true,
}

export default async function AuthHataPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>
}) {
  const { durum } = await searchParams
  const icerik = (durum && DURUMLAR[durum]) || VARSAYILAN
  const basarili = durum === 'kayit-farkli-cihaz'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-4xl">{basarili ? '✓' : '⚠️'}</div>
        <h1 className="mb-4 font-heading text-[28px] font-light text-ink">{icerik.baslik}</h1>
        <p className="mb-8 font-body text-[13px] leading-relaxed text-ink-soft">{icerik.metin}</p>

        <Link
          href={icerik.birincil.yol}
          className="inline-block border border-accent-line px-8 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-accent-deep transition-all hover:bg-accent-deep hover:text-white"
        >
          {icerik.birincil.yazi}
        </Link>

        {icerik.tekrarGonder && (
          <div className="mt-10 border-t border-line pt-8 text-left">
            <p className="mb-3 font-body text-[12px] text-ink-soft">
              Doğrulama bağlantısı gerekiyorsa e-posta adresinizi girin:
            </p>
            <DogrulamaTekrarGonder epostaDuzenlenebilir />
          </div>
        )}
      </div>
    </div>
  )
}
