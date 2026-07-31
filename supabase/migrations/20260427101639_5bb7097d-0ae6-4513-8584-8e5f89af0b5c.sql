-- 1. Pricing on services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS base_price_naira integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_day boolean NOT NULL DEFAULT false;

-- 2. Per-option pricing (mascot characters, armed/unarmed, etc.)
CREATE TABLE IF NOT EXISTS public.service_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.service_fields(id) ON DELETE CASCADE,
  label text NOT NULL,
  price_modifier_naira integer NOT NULL DEFAULT 0,
  stock integer,                    -- null = unlimited; for mascots default 1
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_field_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "options public read" ON public.service_field_options
  FOR SELECT USING (
    is_active = true OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "options admin write" ON public.service_field_options
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sfo_field ON public.service_field_options(field_id, sort_order);

-- 3. Order line totals (snapshot)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_price_naira integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total_naira integer NOT NULL DEFAULT 0;

-- 4. Order totals + invoice paths
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_naira integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_naira integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_storage_path text,
  ADD COLUMN IF NOT EXISTS receipt_storage_path text,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz;

-- 5. Invoices bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Owner of order can read their own invoice/receipt; admins read all.
-- Path convention: <user_id>/<order_id>/<invoice|receipt>.pdf
CREATE POLICY "invoices owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "invoices admin write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "invoices owner write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "invoices admin update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin')
  );

-- 6. Public RPC to check whether an email belongs to an admin
-- (used by the two-step admin login UI). Returns boolean only.
CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id
    WHERE lower(u.email) = lower(_email)
      AND r.role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;