import axios, { AxiosInstance } from "axios";
import { useAuthStore } from "../store/authStore";

const isLocalAddress = (url: string): boolean => /localhost|127\.0\.0\.1/i.test(url);

const resolveApiUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== "undefined") {
    const isLocalFrontend =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    // In production, ignore a misconfigured localhost API URL.
    if (configuredUrl && !(isLocalAddress(configuredUrl) && !isLocalFrontend)) {
      return configuredUrl;
    }

    if (!isLocalFrontend) {
      return `${window.location.origin}/api`;
    }

    return "http://localhost:5000/api";
  }

  if (configuredUrl && !isLocalAddress(configuredUrl)) {
    return configuredUrl;
  }

  return configuredUrl || "http://localhost:5000/api";
};

const API_URL = resolveApiUrl();

let apiClient: AxiosInstance;

export const initializeApiClient = () => {
  apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add token
  apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor to handle errors
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    initializeApiClient();
  }
  return apiClient;
};
