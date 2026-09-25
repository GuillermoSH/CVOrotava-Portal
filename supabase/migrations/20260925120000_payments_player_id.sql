-- Pagos centrados en perfil de jugador (sprint 1).
-- Additive: payments.player_id + players.pays_extended_monthly.
-- Same Supabase project as Team Manager (payments already live).
--
-- Transition: keep payments.user_id; new writes should set both when
-- players.user_id is linked. Do not drop user_id in this sprint.
-- payments.method omitted (uncertain existing constraints / unused in TM).

-- =========================================================
-- 1. players.pays_extended_monthly (cuota base 30 €)
-- =========================================================
alter table public.players
  add column if not exists pays_extended_monthly boolean not null default false;

comment on column public.players.pays_extended_monthly is
  'Si true, cuota mensual ampliada (30 €) en categorías base al generar tarifas. Default false = 25 €. Ignorado en sénior/aficionados.';

-- =========================================================
-- 2. payments.player_id
-- =========================================================
alter table public.payments
  add column if not exists player_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_player_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_player_id_fkey
      foreign key (player_id) references public.players (id) on delete set null;
  end if;
end $$;

comment on column public.payments.player_id is
  'Sujeto del pago (perfil roster). Nullable durante transición; escrituras nuevas deben rellenarlo. Rellenar también user_id si players.user_id está set.';

-- Allow payments for roster players without a TM login.
alter table public.payments
  alter column user_id drop not null;

-- Backfill from linked roster rows (players.user_id = payments.user_id).
update public.payments p
set player_id = pl.id
from public.players pl
where p.player_id is null
  and pl.user_id is not null
  and pl.user_id = p.user_id;

create index if not exists payments_player_id_idx
  on public.payments (player_id)
  where player_id is not null;

notify pgrst, 'reload schema';
