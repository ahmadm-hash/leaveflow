import axios, { AxiosInstance } from "axios";
import { useAuthStore } from "../store/authStore";

const resolveApiUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.origin}/api`;
  }

  return "http://localhost:5000/api";
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
