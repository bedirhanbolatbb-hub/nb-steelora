'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'

/**
 * "Hesabımı sil" akışı (Faz 14).
 *
 * İki adım: önce ne olacağını anlatan bilgi ekranı, sonra şifre + "SİL" yazma
 * teyidi. Tek tıkla silme yok; kazara tetiklenmesi mümkün değil.
 */
export default function HesapSilme() {
  const [adim, setAdim] = useState<0 | 1 | 2>(0)
  const [sifre, setSifre] = useState('')
  const [onay, setOnay] = useState('')
  const [hata, setHata] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const supabase = createClient()

  const onayGecerli = onay.trim().toLocaleUpperCase('tr-TR') === 'SİL'

  const sil = async () => {
    setHata('')
    setGonderiliyor(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sifre, onay: onay.trim() }),
      })
      const veri = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHata(veri?.error || 'Silme işlemi tamamlanamadı.')
        setGonderiliyor(false)
        return
      }
      setAdim(2)
      // Oturum sunucuda kapatıldı. Burada YALNIZ istemci tarafındaki oturum
      // durumu temizlenir; router.refresh() çağrılmaz — sunucu bileşeni
      // tazelenince /hesabim oturumsuz kalıp /giris'e yönlendiriyor ve
      // kullanıcı teyit ekranını hiç göremiyordu.
      supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    } catch {
      setHata('Bağlantı kurulamadı. Lütfen tekrar deneyin.')
      setGonderiliyor(false)
    }
  }

  if (adim === 2) {
    return (
      <div className="border border-line bg-surface-muted p-6">
        <h3 className="mb-3 font-heading text-[20px] font-light text-ink">Hesabınız silindi</h3>
        <p className="mb-2 font-body text-[13px] leading-relaxed text-ink-soft">
          Kişisel bilgileriniz sistemden kaldırıldı. Sipariş kayıtlarınız mali mevzuat gereği
          anonim biçimde saklanıyor — kimliğinizle bağlantısı kalmadı.
        </p>
        <p className="mb-6 font-body text-[12px] text-muted">
          İşlemin özetini e-posta ile de gönderdik.
        </p>
        <a
          href="/"
          className="inline-block border border-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:bg-ink hover:text-bg"
        >
          Mağazaya dön
        </a>
      </div>
    )
  }

  return (
    <div className="border border-line p-6">
      <h3 className="mb-2 font-heading text-[18px] font-light text-ink">Hesabımı sil</h3>

      {adim === 0 && (
        <>
          <p className="mb-4 font-body text-[13px] leading-relaxed text-ink-soft">
            Hesabınızı kalıcı olarak silebilirsiniz. Silme sonrası oturumunuz kapanır ve bu
            bilgilere erişilemez.
          </p>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="border border-line bg-surface-muted p-4">
              <p className="mb-2 font-body text-[10px] uppercase tracking-[0.15em] text-muted">
                Silinecekler
              </p>
              <ul className="list-disc space-y-1 pl-4 font-body text-[12px] leading-relaxed text-ink-soft">
                <li>Ad, e-posta, telefon</li>
                <li>Kayıtlı adresler</li>
                <li>Fatura bilgileri</li>
                <li>Favoriler</li>
                <li>Çerez rızası kaydı</li>
                <li>Yorumlardaki yazar bilgisi</li>
              </ul>
            </div>
            <div className="border border-line p-4">
              <p className="mb-2 font-body text-[10px] uppercase tracking-[0.15em] text-muted">
                Kalacaklar
              </p>
              <p className="font-body text-[12px] leading-relaxed text-ink-soft">
                Sipariş kayıtları <strong className="text-ink">anonim biçimde</strong> saklanır:
                sipariş numarası, ürünler, tutar ve tarih kalır; adınız, e-postanız, telefonunuz
                ve adresiniz çıkarılır. Vergi Usul Kanunu ve TTK bu kayıtların 10 yıl saklanmasını
                zorunlu kılıyor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAdim(1)}
            className="font-body text-[12px] text-muted underline underline-offset-4 transition-colors hover:text-red-600"
          >
            Hesabımı silmek istiyorum
          </button>
        </>
      )}

      {adim === 1 && (
        <>
          <p className="mb-4 font-body text-[13px] leading-relaxed text-ink-soft">
            Bu işlem <strong className="text-ink">geri alınamaz</strong>. Devam etmek için
            şifrenizi girin ve onay kutusuna <strong className="text-ink">SİL</strong> yazın.
          </p>

          <div className="max-w-sm space-y-3">
            <Input
              type="password"
              placeholder="Şifreniz"
              value={sifre}
              autoComplete="current-password"
              onChange={(e) => setSifre(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Onay için SİL yazın"
              value={onay}
              onChange={(e) => setOnay(e.target.value)}
            />

            {hata && <p className="font-body text-[12px] leading-relaxed text-red-600">{hata}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sil}
                disabled={!sifre || !onayGecerli || gonderiliyor}
                className="border border-red-600 bg-red-600 px-6 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {gonderiliyor ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdim(0)
                  setSifre('')
                  setOnay('')
                  setHata('')
                }}
                disabled={gonderiliyor}
                className="border border-ink px-6 py-3 font-body text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:bg-surface-muted disabled:opacity-40"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
