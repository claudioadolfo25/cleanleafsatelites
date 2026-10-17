-- Migration 010: Add data_source column to observaciones_serie, mediciones, and informes tables

ALTER TABLE public.observaciones_serie
ADD COLUMN IF NOT EXISTS data_source VARCHAR(32) DEFAULT 'copernicus_cdse';

ALTER TABLE public.mediciones
ADD COLUMN IF NOT EXISTS data_source VARCHAR(32) DEFAULT 'copernicus_cdse';

ALTER TABLE public.informes
ADD COLUMN IF NOT EXISTS data_source VARCHAR(32) DEFAULT 'copernicus_cdse';
