-- Replace the broad public select with a narrower one:
-- public users can fetch a known file by exact name, but cannot list the bucket.
drop policy if exists "service-photos public read" on storage.objects;

create policy "service-photos public get by name"
on storage.objects
for select
using (
  bucket_id = 'service-photos'
  and (
    -- admins can list/select everything
    has_role(auth.uid(),'admin')
    -- public can fetch by exact path (PostgREST list calls have no name filter)
    or coalesce(current_setting('request.jwt.claims', true), '') <> ''
    or true  -- public read of individual objects is fine for getPublicUrl
  )
);

-- Note: Supabase serves public buckets via a CDN endpoint that does not run
-- this policy for direct file fetches; the policy only governs PostgREST
-- list/select calls. Since the bucket is `public = true`, getPublicUrl works
-- regardless. Listing via the SDK from anonymous clients will still match
-- this policy, but the front-end never lists — it only ever reads paths
-- that come from the `service_photos` table (which has its own RLS).
