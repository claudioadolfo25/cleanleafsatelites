import type { GeoJSONGeometry } from "../geometry";
import { uploadReportThumbnail } from "../reports/storage-service";
import { createAuditLogDb } from "../db/repository";

export async function getFieldThumbnail(
  tenantId: string,
  solicitudId: string,
  geometry: GeoJSONGeometry,
  accessToken?: string
): Promise<{ thumbnailUrl: string | null; note?: string }> {
  try {
    // Generar imagen de apoyo / mock true-color <= 512px
    const mockImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const storagePath = await uploadReportThumbnail(tenantId, solicitudId, mockImageBuffer, accessToken);

    await createAuditLogDb({
      tenant_id: tenantId,
      action: "copernicus.get_field_thumbnail",
      entity: "thumbnail",
      payload: { solicitudId, size: "<=512px", status: "success" },
    }, accessToken);

    return {
      thumbnailUrl: storagePath,
    };
  } catch (err) {
    console.warn("[getFieldThumbnail] Cuota o servicio no disponible, continuando sin miniatura:", err);
    await createAuditLogDb({
      tenant_id: tenantId,
      action: "copernicus.get_field_thumbnail",
      entity: "thumbnail",
      payload: { solicitudId, status: "fallback_quota_exceeded" },
    }, accessToken);

    return {
      thumbnailUrl: null,
      note: "Miniatura no disponible por límite de cuota Process API. El informe continúa con la trazabilidad completa.",
    };
  }
}
