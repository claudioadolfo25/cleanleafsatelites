export function useAuth() {
  return {
    user: { name: "Usuario AgroPulso", email: "demo@agropulso.com" },
    loading: false,
    isAuthenticated: true,
    logout: async () => {},
  };
}
