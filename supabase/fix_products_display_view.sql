-- Run this in Supabase SQL Editor to fix products_display view
-- This adds custom_price to the view and makes display_price respect it
--
-- First check the current view definition:
-- SELECT pg_get_viewdef('products_display', true);
--
-- Then recreate with custom_price:

CREATE OR REPLACE VIEW products_display AS
SELECT
  p.*,
  COALESCE(p.override_title, p.trendyol_title)   AS display_title,
  COALESCE(p.custom_price, p.override_price, p.trendyol_price) AS display_price,
  COALESCE(p.override_images, p.trendyol_images)  AS display_images
FROM products p
WHERE p.is_active = true;

-- If the above fails (columns don't match exactly), run this first to see current definition:
-- SELECT pg_get_viewdef('products_display', true);
-- Then adjust accordingly.
