-- =========================================================
-- Supprime les comptes de test (…@jokko.dev) et ce qu'ils ont créé.
-- node supabase/outil/appliquer.js supabase/nettoyer-tests.sql
-- =========================================================

-- Groupes créés par les comptes de test (leurs messages partent avec)
delete from public.salons
where prive and createur_id in (select id from auth.users where email like '%@jokko.dev');

-- Les comptes : profils, contacts et messages sont supprimés en cascade
delete from auth.users where email like '%@jokko.dev';
