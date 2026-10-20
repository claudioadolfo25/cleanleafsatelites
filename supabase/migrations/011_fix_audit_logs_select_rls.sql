-- Migration 011: Fix RLS SELECT policies for audit_logs table
-- Issue: Previous policy audit_logs_select_admin allowed admin/owner users to SELECT all audit_logs regardless of tenant_id.
-- Fix: Restrict tenant admins and owners to their own tenant_id, while preserving global SELECT access for super_admin.

-- 1. Drop existing SELECT policy
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_tenant_admin_owner" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON public.audit_logs;

-- 2. Policy for Tenant Admins and Owners: strict tenant_id match
CREATE POLICY "audit_logs_select_tenant_admin_owner" ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id = coalesce(
      (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'tenant_id'),
      (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'tenant_id')
    )::uuid
    AND coalesce(
      (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role'),
      (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role')
    ) IN ('admin', 'owner')
  );

-- 3. Policy for Super Admin: global SELECT access
CREATE POLICY "audit_logs_select_super_admin" ON public.audit_logs
  FOR SELECT
  USING (
    coalesce(
      (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role'),
      (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role')
    ) = 'super_admin'
  );
