-- =========================================================
-- JokkoChat - Mise à jour 6 : une vue unique ouverte peut être vide
-- node supabase/outil/appliquer.js supabase/migration-6-vue-unique-ouverte.sql
-- =========================================================

-- Un message doit avoir un contenu, sauf s'il a été supprimé ou ouvert (vue unique)
alter table public.messages drop constraint pas_vide;
alter table public.messages add constraint pas_vide check (
    coalesce(texte, '') <> '' or image_url is not null or audio_url is not null
    or supprime or ouvert_le is not null
);
