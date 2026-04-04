-- Run this in Supabase SQL Editor
-- Replaces products_display view with explicit column list
-- Adds custom_price support and fixes display_images mapping

DROP VIEW IF EXISTS products_display;

CREATE VIEW products_display AS
SELECT
  p.id,
  p.slug,
  p.trendyol_id,
  p.trendyol_title,
  p.trendyol_description,
  p.trendyol_price,
  p.trendyol_stock,
  p.trendyol_images,
  p.trendyol_category,
  p.trendyol_barcode,
  p.override_title,
  p.override_description,
  p.override_price,
  p.override_images,
  p.custom_price,
  p.collection_id,
  p.is_active,
  p.is_featured,
  p.badge,
  p.note,
  p.sales_count,
  p.created_at,
  p.updated_at,
  p.last_synced_at,

  -- Computed display fields
  COALESCE(p.override_title, p.trendyol_title)                       AS display_title,
  COALESCE(p.custom_price, p.override_price, p.trendyol_price)       AS display_price,
  COALESCE(p.override_images, p.trendyol_images)                     AS display_images

FROM products p
WHERE p.is_active = true;
