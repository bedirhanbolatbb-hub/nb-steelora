-- Faz 23 · analytics_events.event CHECK kısıtına 'login' eklenmesi
--
-- NEDEN: Giriş ölçümü koda eklendi ama veritabanı satırı reddediyor
-- (23514 · analytics_events_event_check). Uç `{"ok":true}` döner çünkü ölçüm
-- ateşle-unut çalışır; satır yazılmaz, Vercel çalışma günlüğüne
-- "[analytics] olay yazılamadı" düşer. 22.08.2026'da 12 olay adının hepsi
-- teker teker denendi: yalnız 'login' reddediliyor.
--
-- Bu çalışana kadar: giriş sayısı 0 görünür, BAŞKA HİÇBİR ŞEY etkilenmez.
--
-- Supabase → SQL Editor'de çalıştırın:

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_check CHECK (
    event IN (
      'page_view',
      'product_view',
      'add_to_cart',
      'remove_from_cart',
      'favorite_add',
      'favorite_remove',
      'search',
      'begin_checkout',
      'purchase',
      'signup',
      'login',
      'newsletter_signup'
    )
  );

-- Doğrulama — hata vermemeli, sonra satırı siler:
-- INSERT INTO public.analytics_events (event, session_id, path, device)
--   VALUES ('login', 'ddl-kontrol', '/ddl-kontrol', 'desktop');
-- DELETE FROM public.analytics_events WHERE session_id = 'ddl-kontrol';
