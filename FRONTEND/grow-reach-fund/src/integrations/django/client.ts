/**
 * Django API client used across the frontend.
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  phone: string;
  role: "farmer" | "buyer" | "creditor" | "admin";
  location: string;
  latitude: number | null;
  longitude: number | null;
  bio: string;
  profile_image?: string | null;
  profile_data: Record<string, unknown>;
  is_verified: boolean;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
  message?: string;
}

export interface RegisterRequest {
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
}

type RawUser = {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone_number?: string;
  phone?: string;
  role: "farmer" | "buyer" | "creditor" | "admin";
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string;
  profile_image?: string | null;
  profile_data?: Record<string, unknown>;
  is_verified?: boolean;
};

const normalizeUser = (user: RawUser): User => {
  const firstName = user.first_name ?? "";
  const lastName = user.last_name ?? "";
  const fullName = (user.full_name ?? `${firstName} ${lastName}`.trim()) || user.username;
  const phone = user.phone ?? user.phone_number ?? "";

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    phone_number: phone,
    phone,
    role: user.role,
    location: user.location ?? "",
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    bio: user.bio ?? "",
    profile_image: user.profile_image ?? null,
    profile_data: user.profile_data ?? {},
    is_verified: user.is_verified ?? false,
  };
};

class DjangoAPIClient {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.loadTokens();

    this.api.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && this.refreshToken && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshed = await this.refreshAccessToken();
            this.setTokens(refreshed);
            originalRequest.headers = {
              ...(originalRequest.headers ?? {}),
              Authorization: `Bearer ${refreshed.access}`,
            };
            return this.api(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = "/signin";
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private loadTokens(): void {
    const rawTokens = localStorage.getItem("auth_tokens");
    if (!rawTokens) {
      return;
    }

    try {
      const parsed = JSON.parse(rawTokens) as AuthTokens;
      this.accessToken = parsed.access;
      this.refreshToken = parsed.refresh;
    } catch {
      this.clearTokens();
    }
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.access;
    this.refreshToken = tokens.refresh;
    localStorage.setItem("auth_tokens", JSON.stringify(tokens));
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("auth_tokens");
    localStorage.removeItem("current_user");
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post("/auth/register/", {
      email: data.email,
      username: data.username,
      password: data.password,
      password_confirm: data.password,
      full_name: data.full_name,
      phone: data.phone,
      phone_number: data.phone,
      role: data.role,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      profile_data: data.profile_data ?? {},
    });

    const authData = response.data as AuthResponse & { user: RawUser };
    const normalizedUser = normalizeUser(authData.user);

    this.setTokens({
      access: authData.access,
      refresh: authData.refresh,
    });
    localStorage.setItem("current_user", JSON.stringify(normalizedUser));

    return {
      ...authData,
      user: normalizedUser,
    };
  }

  async login(identifier: string, password: string, role?: string): Promise<AuthResponse> {
    const payload = identifier.includes("@")
      ? { email: identifier, password, role }
      : { username: identifier, password, role };

    const response = await this.api.post("/auth/login/", payload);
    const authData = response.data as AuthResponse & { user: RawUser };
    const normalizedUser = normalizeUser(authData.user);

    this.setTokens({
      access: authData.access,
      refresh: authData.refresh,
    });
    localStorage.setItem("current_user", JSON.stringify(normalizedUser));

    return {
      ...authData,
      user: normalizedUser,
    };
  }

  async logout(): Promise<void> {
    try {
      await this.api.post("/auth/logout/");
    } catch {
      // Backend logout endpoint is optional for JWT flows.
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
      refresh: this.refreshToken,
    });

    return response.data as AuthTokens;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.accessToken) {
      return null;
    }

    const response = await this.api.get("/users/me/");
    const user = normalizeUser(response.data as RawUser);
    localStorage.setItem("current_user", JSON.stringify(user));
    return user;
  }

  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get<T>(endpoint, config);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post<T>(endpoint, data, config);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put<T>(endpoint, data, config);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.patch<T>(endpoint, data, config);
    return response.data;
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete<T>(endpoint, config);
    return response.data;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.api.post("/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPassword
    });
    return response.data;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

export const djangoAPI = new DjangoAPIClient();
export { API_BASE_URL, normalizeUser };
