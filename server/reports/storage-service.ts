import { getSupabaseUserClient } from "../db/supabase-client";
import { getReportByIdDb } from "../db/repository";
import { generateReportPdfBuffer } from "./pdf-service";

const BUCKET_NAME = "reports";

export async function uploadReportPdfToStorage(
  tenantId: string,
  reportId: string,
  pdfBuffer: Buffer,
  accessToken?: string
): Promise<string> {
  const path = `reports/${tenantId}/${reportId}.pdf`;
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      await client.storage.from(BUCKET_NAME).upload(path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    } catch (err) {
      console.warn("[Storage] Error uploading PDF to Supabase Storage:", err);
    }
  }

  return path;
}

export async function uploadReportThumbnail(
  tenantId: string,
  reportId: string,
  imageBuffer: Buffer,
  accessToken?: string
): Promise<string> {
  const path = `${tenantId}/${reportId}/thumb.png`;
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      await client.storage.from(BUCKET_NAME).upload(path, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });
    } catch (err) {
      console.warn("[Storage] Error uploading thumbnail to Supabase Storage:", err);
    }
  }

  return path;
}

export async function getSignedReportDownloadUrlService(
  tenantId: string,
  reportId: string,
  accessToken?: string
): Promise<{ downloadUrl: string; filename: string }> {
  // 1. Validar estrictamente que el informe pertenece al tenant del usuario
  const report = await getReportByIdDb(tenantId, reportId, accessToken);
  if (!report || report.tenantId !== tenantId) {
    throw new Error("NOT_FOUND: Informe no encontrado o no autorizado");
  }

  const filename = `informe-${report.predioNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${report.id}.pdf`;
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const storagePath = `reports/${tenantId}/${reportId}.pdf`;
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 60);

      if (!error && data?.signedUrl) {
        return { downloadUrl: data.signedUrl, filename };
      }
    } catch {
      // Fallback a generación de buffer/Data URL o endpoint seguro
    }
  }

  // Fallback seguro: generar PDF al vuelo y convertir a Data URL (o URL temporal firmada)
  const pdfBuffer = await generateReportPdfBuffer(report);
  const base64 = pdfBuffer.toString("base64");
  const dataUrl = `data:application/pdf;base64,${base64}`;

  return { downloadUrl: dataUrl, filename };
}
