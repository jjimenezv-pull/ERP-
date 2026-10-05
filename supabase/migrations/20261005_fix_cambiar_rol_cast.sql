-- profiles.role es el enum user_role; asignarle el parámetro text sin cast falla (42804)
-- y el cambio de rol desde /usuarios no se podía hacer. Mismo cuerpo, solo se agrega el cast.
CREATE OR REPLACE FUNCTION public.cambiar_rol_usuario_seguro(target_id uuid, nuevo_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admins_actuales int;
  rol_objetivo text;
begin
  if nuevo_rol not in ('admin', 'viewer') then
    raise exception 'Rol inválido: %', nuevo_rol;
  end if;

  -- Lock every admin-role row for the duration of this transaction. A concurrent
  -- call to this function or to bloquear_usuario_seguro that also tries to lock
  -- an overlapping row blocks until this transaction commits or rolls back.
  perform id from public.profiles where role = 'admin' for update;

  select role into rol_objetivo from public.profiles where id = target_id;

  if rol_objetivo = 'admin' and nuevo_rol <> 'admin' then
    select count(*) into admins_actuales from public.profiles where role = 'admin';
    if admins_actuales <= 1 then
      raise exception 'No puedes quitarle el rol de admin al único administrador restante.';
    end if;
  end if;

  update public.profiles set role = nuevo_rol::public.user_role where id = target_id;
end;
$function$;

-- Seguridad: son SECURITY DEFINER y por defecto PostgREST las expone a anon/authenticated
-- (la anon key es pública). Solo el servidor (service_role) debe poder ejecutarlas.
REVOKE EXECUTE ON FUNCTION public.cambiar_rol_usuario_seguro(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bloquear_usuario_seguro(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_rol_usuario_seguro(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bloquear_usuario_seguro(uuid, boolean) TO service_role;
