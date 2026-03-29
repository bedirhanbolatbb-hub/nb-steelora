import Link from 'next/link'

export default function AuthHataPage() {
  return (
    <div className="min-h-screen bg-champagne flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-4xl mb-6">⚠️</div>
        <h1 className="font-heading text-[28px] font-light text-text-primary mb-4">
          Doğrulama Hatası
        </h1>
        <p className="text-[13px] font-body text-text-secondary mb-6">
          E-posta doğrulama linki geçersiz veya süresi dolmuş olabilir.
          Lütfen tekrar deneyin.
        </p>
        <Link
          href="/giris"
          className="inline-block border border-gold text-gold text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:bg-gold hover:text-white transition-all"
        >
          Giriş Sayfasına Dön
        </Link>
      </div>
    </div>
  )
}
