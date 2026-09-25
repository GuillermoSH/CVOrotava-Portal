-- Hard-delete de jugadores: solo rol portal admin (managers usan baja lógica).

drop policy if exists players_delete_admin_manager on public.players;

create policy players_delete_admin on public.players
  for delete
  using ((select public.has_portal_role(array['admin'])));

-- Guardians: permitir que admin borre vínculos al limpiar ficha (ya existía delete admin).
-- Sin ON DELETE CASCADE en player_guardians; la app borra guardians antes del player.

comment on policy players_delete_admin on public.players is
  'Solo admin puede borrar jugadores (hard delete). Manager/coach: usar is_active=false.';
