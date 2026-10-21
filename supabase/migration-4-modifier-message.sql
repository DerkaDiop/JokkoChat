-- =========================================================
-- JokkoChat - Mise à jour 4 : modifier un message envoyé
-- node supabase/outil/appliquer.js supabase/migration-4-modifier-message.sql
-- =========================================================

-- Date de la dernière modification (vide = jamais modifié).
-- L'auteur peut déjà modifier ses messages (règle « modifier_ses_messages »).
alter table public.messages add column modifie_le timestamptz;
