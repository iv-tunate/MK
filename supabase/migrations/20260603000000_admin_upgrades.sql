-- 1. Create a function to check if an admin has a password set.
CREATE OR REPLACE FUNCTION public.admin_has_password(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email);
  IF uid IS NULL THEN RETURN false; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.admin_credentials WHERE user_id = uid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_has_password(text) TO anon, authenticated;

-- 2. Update handle_new_user to make fortunateomonuwa@outlook.com an admin automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- seed first admin and super admin
  IF lower(new.email) = lower('mkguards@yahoo.com') OR lower(new.email) = lower('fortunateomonuwa@outlook.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 3. Ensure fortunateomonuwa@outlook.com has the admin role if they already exist in profiles.
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = 'fortunateomonuwa@outlook.com';
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 4. Update has_role function to check for super admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
BEGIN
  -- check if user is super admin
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) = 'fortunateomonuwa@outlook.com'
  ) INTO is_super_admin;

  IF is_super_admin AND _role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- 5. Update revoke_admin_by_user_id to restrict to super admin and prevent revoking super admin.
CREATE OR REPLACE FUNCTION public.revoke_admin_by_user_id(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  target_email text;
BEGIN
  -- Check caller's email
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR lower(caller_email) != 'fortunateomonuwa@outlook.com' THEN
    RAISE EXCEPTION 'Only the super admin (fortunateomonuwa@outlook.com) can remove other admins';
  END IF;

  -- Check target's email
  SELECT email INTO target_email FROM auth.users WHERE id = _user_id;
  IF lower(target_email) = 'fortunateomonuwa@outlook.com' THEN
    RAISE EXCEPTION 'Super admin role cannot be revoked';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  DELETE FROM public.admin_credentials WHERE user_id = _user_id;
END;
$$;

-- 6. Update user_roles RLS policies to restrict delete to super admin.
DROP POLICY IF EXISTS "roles admin delete" ON public.user_roles;
CREATE POLICY "roles admin delete" ON public.user_roles
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') AND 
    lower(auth.jwt() ->> 'email') = 'fortunateomonuwa@outlook.com'
  );
