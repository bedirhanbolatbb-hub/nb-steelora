-- Faz 9A: homepage_settings'e serbest biçimli payload sütunu (additive).
-- Kullanım: section='hero_slides' satırında payload.slides (kampanya bandı),
-- category_* satırlarında payload.image_url (panelden yüklenen kategori kapağı).
-- hero_top ve mevcut satırlar SİLİNMEZ, değişmez.
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS payload jsonb;
