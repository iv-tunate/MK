-- Add is_super_admin flag to user_roles so super admin is dynamic (not hardcoded).
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Update the existing super admin user if they exist.
UPDATE public.user_roles ur
SET is_super_admin = true
WHERE ur.role = 'admin'
  AND ur.user_id IN (
    SELECT id FROM auth.users WHERE lower(email) = 'fortunateomonuwa@outlook.com'
  );

-- Create a helper RPC to check if the current user is super admin (used by the frontend).
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;

-- Update revoke_admin_by_user_id to use the is_super_admin flag instead of hardcoded email.
CREATE OR REPLACE FUNCTION public.revoke_admin_by_user_id(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_super boolean;
  target_is_super boolean;
BEGIN
  -- Check caller is super admin
  SELECT COALESCE(is_super_admin, false) INTO caller_is_super
  FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin';

  IF NOT COALESCE(caller_is_super, false) THEN
    RAISE EXCEPTION 'Only a super admin can remove other admins';
  END IF;

  -- Prevent revoking another super admin
  SELECT COALESCE(is_super_admin, false) INTO target_is_super
  FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';

  IF COALESCE(target_is_super, false) THEN
    RAISE EXCEPTION 'Super admin role cannot be revoked';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  DELETE FROM public.admin_credentials WHERE user_id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_user_id(uuid) TO authenticated;

-- Update RLS policy to use the dynamic is_super_admin flag.
DROP POLICY IF EXISTS "roles admin delete" ON public.user_roles;
CREATE POLICY "roles admin delete" ON public.user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = auth.uid()
        AND ur2.role = 'admin'
        AND ur2.is_super_admin = true
    )
  );

-- Update handle_new_user to auto-grant super admin flag for the seeded admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super boolean;
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
  IF lower(new.email) IN ('mkguards@yahoo.com', 'fortunateomonuwa@outlook.com') THEN
    v_is_super := lower(new.email) = 'fortunateomonuwa@outlook.com';
    INSERT INTO public.user_roles (user_id, role, is_super_admin)
    VALUES (new.id, 'admin', v_is_super)
    ON CONFLICT (user_id, role) DO UPDATE SET is_super_admin = EXCLUDED.is_super_admin;
  END IF;

  RETURN new;
END;
$$;
