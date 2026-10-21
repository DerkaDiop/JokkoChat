-- =========================================================
-- JokkoChat - Mise à jour 2 : contacts personnels et groupes privés
-- À lancer une seule fois : node supabase/outil/appliquer.js supabase/migration-2-contacts-groupes.sql
-- =========================================================

-- ---------- Numéro et @nomdeprofil ----------
-- Facultatifs, remplis dans « Modifier le profil ». Le @nomdeprofil est unique.
alter table public.profils
    add column pseudo text unique,
    add column telephone text,
    add constraint pseudo_valide check (pseudo ~ '^[a-z0-9_.]{3,20}$');

-- ---------- Liste de contacts de chacun ----------
create table public.contacts (
    proprietaire_id uuid not null references public.profils (id) on delete cascade,
    contact_id uuid not null references public.profils (id) on delete cascade,
    cree_le timestamptz not null default now(),
    primary key (proprietaire_id, contact_id),
    constraint pas_soi_meme check (proprietaire_id <> contact_id)
);

alter table public.contacts enable row level security;

create policy "voir_ses_contacts" on public.contacts
    for select to authenticated using (proprietaire_id = auth.uid());

create policy "ajouter_contact" on public.contacts
    for insert to authenticated with check (proprietaire_id = auth.uid());

create policy "retirer_contact" on public.contacts
    for delete to authenticated using (proprietaire_id = auth.uid());

-- ---------- Groupes privés ----------
-- Un groupe est un salon « prive » : seuls ses membres le voient et y écrivent.
alter table public.salons add column prive boolean not null default false;

create table public.salon_membres (
    salon_id uuid not null references public.salons (id) on delete cascade,
    membre_id uuid not null references public.profils (id) on delete cascade,
    primary key (salon_id, membre_id)
);

alter table public.salon_membres enable row level security;

-- « security definer » : évite que la règle de salon_membres se lise elle-même en boucle
create function public.est_membre(salon uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
    select exists (
        select 1 from public.salon_membres
        where salon_id = salon and membre_id = auth.uid()
    );
$$;

create policy "voir_membres" on public.salon_membres
    for select to authenticated using (public.est_membre(salon_id));

-- Seul le créateur du groupe ajoute les membres
create policy "ajouter_membres" on public.salon_membres
    for insert to authenticated
    with check (exists (select 1 from public.salons s where s.id = salon_id and s.createur_id = auth.uid()));

-- Salons publics visibles par tous, groupes seulement par leurs membres
drop policy "Lire les salons" on public.salons;
create policy "lire_salons" on public.salons
    for select to authenticated
    using (not prive or createur_id = auth.uid() or public.est_membre(id));

-- Messages : privés entre deux personnes, salons publics, ou groupes dont on est membre
drop policy "Lire ses messages" on public.messages;
create policy "lire_messages" on public.messages
    for select to authenticated
    using (
        auteur_id = auth.uid()
        or destinataire_id = auth.uid()
        or exists (select 1 from public.salons s
                   where s.id = salon_id and (not s.prive or public.est_membre(s.id)))
    );

drop policy "Envoyer un message" on public.messages;
create policy "envoyer_message" on public.messages
    for insert to authenticated
    with check (
        auteur_id = auth.uid()
        and (destinataire_id is not null
             or exists (select 1 from public.salons s
                        where s.id = salon_id and (not s.prive or public.est_membre(s.id))))
    );

-- Un membre ajouté à un groupe le voit apparaître tout de suite
alter publication supabase_realtime add table public.salon_membres;
