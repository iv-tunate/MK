-- Storage policies for the private `invoices` bucket.
-- File path convention: <user_id>/<order_id>/(invoice|receipt).pdf

DROP POLICY IF EXISTS "invoices owner read" ON storage.objects;
DROP POLICY IF EXISTS "invoices admin read" ON storage.objects;
DROP POLICY IF EXISTS "invoices admin write" ON storage.objects;
DROP POLICY IF EXISTS "invoices admin update" ON storage.objects;
DROP POLICY IF EXISTS "invoices admin delete" ON storage.objects;

CREATE POLICY "invoices owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "invoices admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "invoices admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "invoices admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "invoices admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

-- Also let the order owner upload their own invoice on order submit.
DROP POLICY IF EXISTS "invoices owner write" ON storage.objects;
CREATE POLICY "invoices owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
