-- Safe and compatible migration history query for Supabase Postgres
-- Checks information_schema before selecting execution timestamp column.

DO $$
DECLARE
  has_executed_at BOOLEAN;
  has_inserted_at BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schema_migrations' AND column_name = 'executed_at'
  ) INTO has_executed_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schema_migrations' AND column_name = 'inserted_at'
  ) INTO has_inserted_at;

  IF has_executed_at THEN
    EXECUTE 'SELECT version, executed_at FROM supabase_migrations.schema_migrations ORDER BY version DESC';
  ELSIF has_inserted_at THEN
    EXECUTE 'SELECT version, inserted_at FROM supabase_migrations.schema_migrations ORDER BY version DESC';
  ELSE
    EXECUTE 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC';
  END IF;
END $$;
