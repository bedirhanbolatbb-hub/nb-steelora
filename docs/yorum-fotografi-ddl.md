# Yorum fotoğrafı kolonu (Faz 11D) — BB çalıştıracak

Supabase SQL Editor'da:

```sql
alter table public.reviews add column if not exists photo_url text;
```

Kolon açılana kadar site kırılmaz: fotoğraflı yorum gönderilirse metin
fotoğrafsız kaydedilir ve log düşer; kolon açıldığı andan itibaren fotoğraflar
kaydedilmeye ve (onaydan sonra) görünmeye başlar. Geri almak gerekirse:
`alter table public.reviews drop column photo_url;`
