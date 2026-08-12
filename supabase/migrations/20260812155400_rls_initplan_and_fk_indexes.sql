-- Advisor remediation: auth_rls_initplan (0003) + unindexed_foreign_keys (0001).
--
-- Part 1 wraps auth.uid() / auth.jwt() in a scalar subselect so Postgres evaluates
-- them once per query (InitPlan) instead of once per row. Predicates are otherwise
-- unchanged: same roles, same commands, same logic.
--
-- Part 2 indexes the foreign keys on the per-user read paths. The remaining
-- unindexed FKs (reviews.product_id, reviews.user_id, products.collection_id,
-- wishlists.product_id, user_addresses.user_id, user_billing.user_id,
-- orders.applied_campaign_id) are still open and deliberately not covered here.
--
-- Policy names below match the live database, which diverges from the names in
-- 20260407120000_order_requests.sql. Apply against this project, not a fresh one.

-- Part 1: hoist auth.* calls out of the per-row path -------------------------

ALTER POLICY "Users can view own profile" ON public.user_profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can update own profile" ON public.user_profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "Users can insert own profile" ON public.user_profiles
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users own addresses" ON public.user_addresses
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users own billing" ON public.user_billing
  USING ((select auth.uid()) = user_id);

-- FOR ALL policy: WITH CHECK is intentionally left unset so it keeps falling
-- back to USING, matching current behaviour.
ALTER POLICY "Users manage own wishlist" ON public.wishlists
  USING (((select auth.uid()) = user_id) OR (guest_id IS NOT NULL))
  WITH CHECK (((select auth.uid()) = user_id) OR (guest_id IS NOT NULL));

ALTER POLICY "Users can view own orders" ON public.orders
  USING (
    ((select auth.uid()) = user_id)
    OR (guest_email = ((select auth.jwt()) ->> 'email'::text))
  );

ALTER POLICY "Users can view own requests" ON public.order_requests
  USING (
    order_id IN (
      SELECT orders.id
      FROM public.orders
      WHERE orders.user_id = (select auth.uid())
    )
  );

ALTER POLICY "Users can insert own requests" ON public.order_requests
  WITH CHECK (
    order_id IN (
      SELECT orders.id
      FROM public.orders
      WHERE orders.user_id = (select auth.uid())
    )
  );

-- Part 2: cover the foreign keys on the per-user read paths ------------------
-- Plain (non-concurrent) CREATE INDEX: these tables are small and the migration
-- runs in a transaction. Revisit if orders grows past a few hundred thousand rows.

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS idx_order_requests_order_id
  ON public.order_requests (order_id);

CREATE INDEX IF NOT EXISTS idx_order_requests_user_id
  ON public.order_requests (user_id);
