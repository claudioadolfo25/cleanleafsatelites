import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware: Exige usuario autenticado
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Middleware: Exige tenant_id en ctx.user. Si no tiene tenant -> FORBIDDEN TENANT_REQUIRED
const requireTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user || !ctx.user.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "TENANT_REQUIRED: Se requiere un tenant asignado para realizar esta acción.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        tenantId: ctx.user.tenantId,
      },
    },
  });
});

// Procedimiento para usuario autenticado sin requerir tenant_id (e.g. onboarding.createTenant, auth.me, profile.get, auth.logout)
export const tenantOptionalProcedure = t.procedure.use(requireUser);

// Procedimiento estándar de negocio: requiere autenticación y tenant_id obligatorio
export const protectedProcedure = t.procedure.use(requireUser).use(requireTenant);

// Middleware: Exige rol super_admin
export const superAdminProcedure = t.procedure.use(requireUser).use(requireTenant).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acceso denegado. Se requieren permisos de super_admin.",
      });
    }

    return next();
  })
);

// Middleware: Exige rol de administración de tenant (admin u owner, o super_admin)
export const tenantAdminProcedure = t.procedure.use(requireUser).use(requireTenant).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const allowedRoles = ["admin", "owner", "super_admin"];
    if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acceso denegado. Solo un administrador u propietario puede realizar esta acción.",
      });
    }

    return next();
  })
);

// Procedimiento legado admin (mapeado a superAdminProcedure por defecto para seguridad)
export const adminProcedure = superAdminProcedure;
