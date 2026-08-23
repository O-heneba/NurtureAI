-- Compatibility overload for existing policies that call has_role(user_id, role_name).
-- The base migration's enum-first signature remains unchanged because it is already applied.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::public.app_role
  );
$$;
