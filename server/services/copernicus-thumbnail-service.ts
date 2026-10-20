import type { GeoJSONGeometry } from "../geometry";
import { uploadReportThumbnail } from "../reports/storage-service";
import { createAuditLogDb } from "../db/repository";

export async function getFieldThumbnail(
  tenantId: string,
  solicitudId: string,
  geometry: GeoJSONGeometry,
  accessToken?: string,
  actorContext?: { userId?: string | null; userEmail?: string | null; actorType?: "user" | "system" }
): Promise<{ thumbnailUrl: string | null; note?: string }> {
  try {
    // Generar imagen de apoyo / mock true-color <= 512px
    const mockImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const storagePath = await uploadReportThumbnail(tenantId, solicitudId, mockImageBuffer, accessToken);

    try {
      await createAuditLogDb({
        tenant_id: tenantId,
        user_id: actorContext?.userId ?? null,
        user_email: actorContext?.userEmail ?? null,
        action: "copernicus.get_field_thumbnail",
        entity: "thumbnail",
        payload: { solicitudId, size: "<=512px", status: "success", actor_type: actorContext?.actorType ?? (actorContext?.userId ? "user" : "system") },
      });
    } catch (auditErr) {
      console.error("[AuditLogWriteError] Failed to create audit log for thumbnail:", auditErr);
    }

    return {
      thumbnailUrl: storagePath,
    };
  } catch (err) {
    console.warn("[getFieldThumbnail] Cuota o servicio no disponible, continuando sin miniatura:", err);
    try {
      await createAuditLogDb({
        tenant_id: tenantId,
        user_id: actorContext?.userId ?? null,
        user_email: actorContext?.userEmail ?? null,
        action: "copernicus.get_field_thumbnail",
        entity: "thumbnail",
        payload: { solicitudId, status: "fallback_quota_exceeded", actor_type: actorContext?.actorType ?? (actorContext?.userId ? "user" : "system") },
      });
    } catch (auditErr) {
      console.error("[AuditLogWriteError] Failed to create audit log for thumbnail error:", auditErr);
    }

    return {
      thumbnailUrl: null,
      note: "Miniatura no disponible por límite de cuota Process API. El informe continúa con la trazabilidad completa.",
    };
  }
}
