import { getApiClient } from "./apiClient";

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const response = await getApiClient().post("/auth/login", payload);
    return response.data;
  },

  async register(payload: RegisterPayload) {
    const response = await getApiClient().post("/auth/register", payload);
    return response.data;
  },

  async getProfile() {
    const response = await getApiClient().get("/users/profile");
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await getApiClient().put("/users/profile", data);
    return response.data;
  },
};
