INSERT INTO public.user_roles (user_id, role)
SELECT id, 'chps_worker'::public.app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;