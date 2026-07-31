REVOKE ALL ON FUNCTION public.is_admin_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;