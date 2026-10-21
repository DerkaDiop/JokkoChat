-- =========================================================
-- JokkoChat - Base de données Supabase
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run
-- =========================================================

-- ---------- Profils ----------
-- Un profil par compte. Il est créé automatiquement à l'inscription
-- à partir des infos envoyées par le formulaire (nom, niveau...).
create table public.profils (
    id uuid primary key references auth.users (id) on delete cascade,
    nom text not null,
    email text not null,
    bio text default '',
    niveau text,
    specialite text,
    departement text,
    cree_le timestamptz not null default now()
);

alter table public.profils enable row level security;

-- Tout utilisateur connecté voit les autres (pour la liste des contacts)
create policy "Lire les profils" on public.profils
    for select to authenticated using (true);

-- Chacun ne modifie que son propre profil
create policy "Modifier son profil" on public.profils
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create function public.creer_profil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profils (id, nom, email, niveau, specialite, departement)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data ->> 'nom', ''), split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data ->> 'niveau',
        new.raw_user_meta_data ->> 'specialite',
        new.raw_user_meta_data ->> 'departement'
    );
    return new;
end;
$$;

create trigger a_l_inscription
    after insert on auth.users
    for each row execute function public.creer_profil();

-- ---------- Salons ----------
create table public.salons (
    id uuid primary key default gen_random_uuid(),
    nom text not null unique,
    description text default '',
    icone text not null default 'fa-hashtag',
    couleur text not null default '#4f46e5',
    createur_id uuid references public.profils (id) on delete set null,
    cree_le timestamptz not null default now()
);

alter table public.salons enable row level security;

create policy "Lire les salons" on public.salons
    for select to authenticated using (true);

create policy "Créer un salon" on public.salons
    for insert to authenticated with check (createur_id = auth.uid());

insert into public.salons (nom, description, icone, couleur) values
    ('Général', 'Discussions générales entre étudiants.', 'fa-users', '#4f46e5'),
    ('Projets', 'Organisation et travaux de groupe.', 'fa-diagram-project', '#10b981'),
    ('Études', 'Aide aux devoirs et révisions.', 'fa-book', '#8b5cf6'),
    ('Sports', 'Activités sportives et événements.', 'fa-futbol', '#f97316'),
    ('Aide & Support', 'Questions et entraide technique.', 'fa-circle-question', '#ec4899');

-- ---------- Messages ----------
-- Un message va SOIT dans un salon (salon_id), SOIT à une personne (destinataire_id).
create table public.messages (
    id bigint generated always as identity primary key,
    auteur_id uuid not null references public.profils (id) on delete cascade,
    salon_id uuid references public.salons (id) on delete cascade,
    destinataire_id uuid references public.profils (id) on delete cascade,
    texte text,
    image_url text,
    audio_url text,
    duree integer,
    vue_unique boolean not null default false,
    supprime boolean not null default false,
    cree_le timestamptz not null default now(),
    constraint un_seul_destinataire check ((salon_id is null) <> (destinataire_id is null)),
    constraint pas_vide check (coalesce(texte, '') <> '' or image_url is not null or audio_url is not null or supprime)
);

create index messages_salon on public.messages (salon_id, cree_le);
create index messages_prives on public.messages (auteur_id, destinataire_id, cree_le);

alter table public.messages enable row level security;

-- Salons : tout le monde lit. Messages privés : seulement l'auteur et le destinataire.
create policy "Lire ses messages" on public.messages
    for select to authenticated
    using (salon_id is not null or auteur_id = auth.uid() or destinataire_id = auth.uid());

-- On ne peut envoyer qu'en son propre nom
create policy "Envoyer un message" on public.messages
    for insert to authenticated with check (auteur_id = auth.uid());

-- « Supprimer pour tous » : l'auteur vide son message (supprime = true)
create policy "Modifier ses messages" on public.messages
    for update to authenticated using (auteur_id = auth.uid()) with check (auteur_id = auth.uid());

-- ---------- Temps réel ----------
-- Les pages reçoivent les nouveaux messages dès qu'ils sont ajoutés
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.salons;

-- ---------- Fichiers (images et messages vocaux) ----------
-- Dossier « fichiers » public en lecture ; chacun dépose dans son propre sous-dossier.
insert into storage.buckets (id, name, public)
values ('fichiers', 'fichiers', true);

create policy "Déposer ses fichiers" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'fichiers' and (storage.foldername(name))[1] = auth.uid()::text);
