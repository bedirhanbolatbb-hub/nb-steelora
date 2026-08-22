-- NB Steelora — Trendyol stok senkronu tabloları (Faz 16B)
-- Supabase → SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.

-- ── Kuyruk ────────────────────────────────────────────────────────────────
-- Ödeme onayında / iptal-iade onayında satır yazılır; işleme ayrı adımda olur,
-- böylece Trendyol'daki bir gecikme ödeme akışını hiçbir koşulda bloklamaz.
CREATE TABLE IF NOT EXISTS public.stock_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  item_index integer NOT NULL,                 -- siparişteki kalem sırası
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  barcode text NOT NULL,
  delta integer NOT NULL,                      -- satışta negatif, iadede pozitif
  direction text NOT NULL,                     -- 'satis' | 'iade'
  status text NOT NULL DEFAULT 'bekliyor',     -- bekliyor | islendi | basarisiz | atlandi
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  batch_request_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT stock_sync_queue_direction_check CHECK (direction IN ('satis','iade')),
  CONSTRAINT stock_sync_queue_status_check CHECK (status IN ('bekliyor','islendi','basarisiz','atlandi'))
);

-- İdempotens: aynı siparişin aynı kalemi aynı yönde iki kez kuyruğa giremez.
CREATE UNIQUE INDEX IF NOT EXISTS stock_sync_queue_idempotent
  ON public.stock_sync_queue (order_id, item_index, direction);

CREATE INDEX IF NOT EXISTS stock_sync_queue_bekleyen
  ON public.stock_sync_queue (status, next_attempt_at);

-- ── Yazım günlüğü ─────────────────────────────────────────────────────────
-- Her denemenin izi: geri alma bu tablodaki "önceki değer" ile yapılır.
CREATE TABLE IF NOT EXISTS public.stock_sync_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  barcode text NOT NULL,
  product_id uuid,
  mode text NOT NULL,                          -- off | shadow | whitelist | on
  previous_quantity integer,                   -- yazımdan önce Trendyol'daki canlı değer
  written_quantity integer,                    -- yazılan (ya da gölge modda yazılacak olan) değer
  delta integer NOT NULL,
  batch_request_id text,
  item_status text,                            -- Trendyol kalem sonucu (SUCCESS/FAILED)
  error text,
  queue_id uuid REFERENCES public.stock_sync_queue(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS stock_sync_log_zaman ON public.stock_sync_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS stock_sync_log_barkod ON public.stock_sync_log (barcode, occurred_at DESC);

-- RLS: iki tablo da yalnız service_role tarafından kullanılır (panel + sunucu).
ALTER TABLE public.stock_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_sync_log ENABLE ROW LEVEL SECURITY;
