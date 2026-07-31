-- Admin password gate: separate password required after a normal OTP login,
-- only when the user is an admin. Stored hashed with pgcrypto.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  user_id    uuid PRIMARY KEY,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can read existence (used internally by RPCs); no direct row reads.
CREATE POLICY "admin_credentials admin select"
  ON public.admin_credentials FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_credentials admin write"
  ON public.admin_credentials FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Verify a candidate admin password against the stored hash for a given email.
-- SECURITY DEFINER so it can read auth.users + admin_credentials safely.
CREATE OR REPLACE FUNCTION public.verify_admin_password(_email text, _password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  hash text;
BEGIN
  SELECT u.id INTO uid
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id
  WHERE lower(u.email) = lower(_email) AND r.role = 'admin'
  LIMIT 1;
  IF uid IS NULL THEN RETURN false; END IF;

  SELECT password_hash INTO hash FROM public.admin_credentials WHERE user_id = uid;
  IF hash IS NULL THEN RETURN false; END IF;

  RETURN crypt(_password, hash) = hash;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_password(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text, text) TO anon, authenticated;

-- Admin sets/changes another admin's password (or their own).
CREATE OR REPLACE FUNCTION public.set_admin_password(_user_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can set admin passwords';
  END IF;
  IF length(_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  INSERT INTO public.admin_credentials (user_id, password_hash, updated_at)
  VALUES (_user_id, crypt(_password, gen_salt('bf', 10)), now())
  ON CONFLICT (user_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_password(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_admin_password(uuid, text) TO authenticated;

-- Promote / demote admin by email (admin-only).
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant admin role';
  END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email);
  IF uid IS NULL THEN RAISE EXCEPTION 'No user with that email — they must sign in once first'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_admin_by_user_id(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke admin role';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  DELETE FROM public.admin_credentials WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin_by_user_id(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_user_id(uuid) TO authenticated;

-- List admins (admin-only). Returns minimal profile info.
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE (user_id uuid, email text, first_name text, last_name text, has_password boolean, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list admins';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.first_name, p.last_name,
           (ac.user_id IS NOT NULL) AS has_password,
           r.created_at
      FROM public.user_roles r
      JOIN public.profiles p ON p.id = r.user_id
      LEFT JOIN public.admin_credentials ac ON ac.user_id = r.user_id
      WHERE r.role = 'admin'
      ORDER BY r.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_admins() FROM public;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;
