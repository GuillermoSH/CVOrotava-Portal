-- Composite indexes for admin roster list filters / pagination.
create index if not exists players_season_team_id_idx
  on public.players (season, team_id);

create index if not exists players_season_is_active_idx
  on public.players (season, is_active);
