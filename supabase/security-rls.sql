-- Harden public schema tables for server-side-only access (Drizzle / Auth.js).
-- Safe to re-run. Does not add policies: RLS default-deny blocks PostgREST
-- (anon / authenticated). Direct Postgres connections used by the app continue
-- to work as the postgres superuser (bypasses RLS).
--
-- Apply after `bun run db:push` if Supabase re-grants API roles on new tables:
--   psql "$POSTGRES_URL_NON_POOLING" -f supabase/security-rls.sql
-- Or paste into Supabase Dashboard → SQL Editor.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'kainga-compass\_%' ESCAPE '\'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      r.table_name
    );
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      r.table_name
    );
    RAISE NOTICE 'Hardened %', r.table_name;
  END LOOP;
END $$;
