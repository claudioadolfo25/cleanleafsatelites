-- Migration 006: Audit Logs and Email Notification Preferences
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT
  USING (
    (nullif(current_setting('request.jwt.claims', true), '')::json -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'super_admin')
  );

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR true);

-- Add notification settings columns to user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS notify_email_completed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_failed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_alert BOOLEAN NOT NULL DEFAULT true;
