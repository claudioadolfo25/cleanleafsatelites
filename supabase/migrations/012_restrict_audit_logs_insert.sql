-- Migration 012: Restrict direct INSERT on audit_logs table via DCL REVOKE
-- Issue: Ordinary authenticated users could execute direct SQL INSERT statements on public.audit_logs.

-- Drop legacy permissive INSERT policies
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_all" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_all_authenticated" ON public.audit_logs;

-- Explicit DCL Privilege Revocation
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;
GRANT INSERT ON public.audit_logs TO service_role;
