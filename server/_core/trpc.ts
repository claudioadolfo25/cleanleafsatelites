import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(
  t.middleware(async opts => {
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
  })
);

const requireTenantUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  if (!ctx.user.tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "tenant_id requerido en metadata de usuario" });
  }

  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        tenantId: ctx.user.tenantId as string,
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(requireTenantUser);

export const superAdminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acceso denegado. Se requiere rol super_admin." });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const tenantAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "owner", "super_admin"].includes(ctx.user.role) || !ctx.user.tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acceso denegado. Se requiere rol de administrador u propietario de tenant." });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.user.tenantId,
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "owner", "super_admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
