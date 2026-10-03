-- Refleja profiles.password_set en auth.users.raw_app_meta_data para que el middleware
-- lea la marca del getUser() sin consultar `profiles` en cada request.
-- Idempotente: solo toca usuarios con password_set = true y conserva el resto del app_metadata.
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('password_set', true)
FROM public.profiles p
WHERE p.id = u.id
  AND p.password_set = true;
