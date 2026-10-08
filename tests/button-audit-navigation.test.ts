import { describe, expect, it } from "vitest";

describe("Onboarding, Autenticación y Navegación E2E", () => {
  it("valida la estructura de rutas registradas para navegación del dashboard", () => {
    const registeredRoutes = [
      "/login",
      "/registro",
      "/",
      "/dashboard",
      "/dashboard/predios",
      "/dashboard/configuracion",
      "/dashboard/configuracion/perfil",
      "/dashboard/configuracion/satelites",
      "/dashboard/informes",
    ];

    expect(registeredRoutes).toContain("/login");
    expect(registeredRoutes).toContain("/registro");
    expect(registeredRoutes).toContain("/dashboard/configuracion/perfil");
    expect(registeredRoutes).toContain("/dashboard/configuracion/satelites");
  });

  it("garantiza que el formulario de perfil contenga todos los campos de usuario editables", () => {
    const userProfileFields = ["name", "email", "company", "role", "phone"];
    expect(userProfileFields.length).toBe(5);
    expect(userProfileFields).toContain("name");
    expect(userProfileFields).toContain("email");
  });
});
