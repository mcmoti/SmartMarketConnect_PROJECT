/**
 * Utility for resolving image URLs from the Django backend.
 */
import { API_BASE_URL } from "@/integrations/django/client";

/**
 * Normalizes an image URL. 
 * If the URL is relative (e.g. starts with /media/), it prepends the backend host.
 */
export const resolveImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  
  // If it's already an absolute URL (starts with http)
  if (url.startsWith("http")) return url;
  
  // Get base backend URL (strip /api from http://127.0.0.1:8000/api)
  const backendBase = API_BASE_URL.replace("/api", "");
  
  // Ensure the URL starts with a slash
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  
  return `${backendBase}${cleanUrl}`;
};
