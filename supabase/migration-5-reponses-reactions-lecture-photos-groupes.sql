-- =========================================================
-- JokkoChat - Mise à jour 5
-- Répondre, réactions, accusés de lecture, vue unique partagée,
-- photo de profil, gestion des groupes.
-- node supabase/outil/appliquer.js supabase/migration-5-reponses-reactions-lecture-photos-groupes.sql
-- =========================================================

-- ---------- 1. Répondre à un message ----------
alter table public.messages
    add column reponse_a bigint references public.messages (id) on delete set null;

-- ---------- 2. Réactions (une par personne et par message) ----------
create table public.reactions (
    message_id bigint not null references public.messages (id) on delete cascade,
    utilisateur_id uuid not null references public.profils (id) on delete cascade,
    emoji text not null check (char_length(emoji) <= 16),
    primary key (message_id, utilisateur_id)
);

alter table public.reactions enable row level security;

-- On voit les réactions des messages qu'on a le droit de lire
create policy "voir_reactions" on public.reactions
    for select to authenticated
    using (exists (select 1 from public.messages m where m.id = message_id));

create policy "reagir" on public.reactions
    for insert to authenticated
    with check (utilisateur_id = auth.uid()
                and exists (select 1 from public.messages m where m.id = message_id));

create policy "changer_sa_reaction" on public.reactions
    for update to authenticated
    using (utilisateur_id = auth.uid()) with check (utilisateur_id = auth.uid());

create policy "retirer_sa_reaction" on public.reactions
    for delete to authenticated using (utilisateur_id = auth.uid());

-- « full » : quand une réaction est retirée, le temps réel sait de quel message il s'agit
alter table public.reactions replica identity full;
alter publication supabase_realtime add table public.reactions;

-- ---------- 3. Accusés de lecture (messages privés) ----------
alter table public.messages add column lu_le timestamptz;

-- Le destinataire marque comme lus les messages reçus d'une personne.
-- Fonction « security definer » : il ne peut changer QUE la date de lecture.
create function public.marquer_lus(expediteur uuid)
returns void
language sql
security definer set search_path = ''
as $$
    update public.messages
    set lu_le = now()
    where destinataire_id = auth.uid() and auteur_id = expediteur and lu_le is null;
$$;

-- ---------- 4. Vue unique partagée (messages privés) ----------
alter table public.messages add column ouvert_le timestamptz;

-- Le destinataire ouvre le message : son contenu est effacé pour tout le monde
create function public.ouvrir_vue_unique(message bigint)
returns void
language sql
security definer set search_path = ''
as $$
    update public.messages
    set ouvert_le = now(), texte = null, image_url = null, audio_url = null
    where id = message and destinataire_id = auth.uid() and vue_unique and ouvert_le is null;
$$;

-- ---------- 5. Photo de profil ----------
alter table public.profils add column photo_url text;

-- ---------- 6. Gérer un groupe ----------
-- Le créateur renomme son groupe
create policy "renommer_son_groupe" on public.salons
    for update to authenticated
    using (prive and createur_id = auth.uid()) with check (prive and createur_id = auth.uid());

-- Le créateur retire un membre ; chacun peut quitter un groupe
create policy "retirer_membre" on public.salon_membres
    for delete to authenticated
    using (membre_id = auth.uid()
           or exists (select 1 from public.salons s where s.id = salon_id and s.createur_id = auth.uid()));

-- « full » : la personne retirée est prévenue en temps réel
alter table public.salon_membres replica identity full;
