-- Migration 012: Restrict direct INSERT on audit_logs table
-- Issue: Ordinary authenticated users could execute direct SQL INSERT statements on public.audit_logs.
-- Fix: Drop all permissive INSERT policies on audit_logs for ordinary users.
-- With RLS enabled on audit_logs and no INSERT policy defined for 'authenticated' / 'public' roles,
-- PostgreSQL default-deny RLS blocks direct client writes (HTTP REST / GraphQL / client SDK).
-- The trusted backend using service_role key continues bypassing RLS to author audit records securely.

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_all" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_all_authenticated" ON public.audit_logs;
