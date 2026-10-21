-- =========================================================
-- JokkoChat - Mise à jour 3 : prénom et nom choisis pour un contact
-- node supabase/outil/appliquer.js supabase/migration-3-nom-des-contacts.sql
-- =========================================================

-- Le nom sous lequel j'enregistre quelqu'un (comme dans le répertoire d'un téléphone)
alter table public.contacts
    add column prenom text,
    add column nom text;

-- Renommer un contact déjà enregistré
create policy "modifier_contact" on public.contacts
    for update to authenticated
    using (proprietaire_id = auth.uid()) with check (proprietaire_id = auth.uid());
