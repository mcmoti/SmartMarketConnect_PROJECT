import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { djangoAPI, type User, type AuthResponse } from "@/integrations/django/client";

type AppRole = "farmer" | "buyer" | "creditor" | "admin";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, role?: string) => Promise<AuthResponse>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    role: "farmer" | "buyer" | "creditor";
    location?: string;
    username?: string;
    latitude?: number;
    longitude?: number;
    profile_data?: Record<string, unknown>;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isAuthenticated: false,
  login: async () => { throw new Error("Auth not initialized"); },
  register: async () => { throw new Error("Auth not initialized"); },
  logout: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const cachedUser = localStorage.getItem("current_user");
        const tokens = localStorage.getItem("auth_tokens");

        if (cachedUser && tokens) {
          try {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setRole(userData.role as AppRole);
          } catch (e) {
            console.error("Failed to parse cached user", e);
            localStorage.removeItem("current_user");
          }
        } else if (tokens) {
          try {
            const currentUser = await djangoAPI.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              setRole(currentUser.role as AppRole);
              localStorage.setItem("current_user", JSON.stringify(currentUser));
            }
          } catch (error) {
            console.error("Failed to fetch current user", error);
            localStorage.removeItem("auth_tokens");
            localStorage.removeItem("current_user");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    identifier: string,
    password: string,
    userRole?: string
  ): Promise<AuthResponse> => {
    const response = await djangoAPI.login(identifier, password, userRole);
    setUser(response.user);
    setRole(response.user.role as AppRole);
    return response;
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    role: "farmer" | "buyer" | "creditor";
    location?: string;
    username?: string;
    latitude?: number;
    longitude?: number;
    profile_data?: Record<string, unknown>;
  }): Promise<AuthResponse> => {
    const response = await djangoAPI.register(data);
    setUser(response.user);
    setRole(response.user.role as AppRole);
    return response;
  };

  const logout = async () => {
    await djangoAPI.logout();
    setUser(null);
    setRole(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await djangoAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setRole(currentUser.role as AppRole);
        localStorage.setItem("current_user", JSON.stringify(currentUser));
      }
    } catch (e) {
      console.error("Failed to refresh user", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAuthenticated: !!user && !!localStorage.getItem("auth_tokens"),
        login,
        register,
        logout,
        signOut: logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
