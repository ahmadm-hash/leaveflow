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

interface UpdateProfilePayload {
  email?: string;
  fullName?: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: "EMPLOYEE" | "SUPERVISOR" | "DEPARTMENT_HEAD" | "ADMIN";
  isActive?: boolean;
  annualLeaveBalance?: number;
  site?: {
    id: string;
    name: string;
    location?: string;
  } | null;
}

export interface ManagedUserPayload extends RegisterPayload {
  role: "EMPLOYEE" | "SUPERVISOR" | "DEPARTMENT_HEAD" | "ADMIN";
  siteId?: string;
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

  async createUser(payload: ManagedUserPayload): Promise<{ message: string; user: ManagedUser }> {
    const response = await getApiClient().post("/users", payload);
    return response.data;
  },

  async getProfile() {
    const response = await getApiClient().get("/users/profile");
    return response.data;
  },

  async updateProfile(data: UpdateProfilePayload) {
    const response = await getApiClient().put("/users/profile", data);
    return response.data;
  },

  async getAllUsers(): Promise<{ users: ManagedUser[] }> {
    const response = await getApiClient().get("/users");
    return response.data;
  },

  async getSiteEmployees(): Promise<{ users: ManagedUser[] }> {
    const response = await getApiClient().get("/users/site-employees");
    return response.data;
  },

  async deactivateUser(userId: string): Promise<{ message: string }> {
    const response = await getApiClient().put(`/users/${userId}/deactivate`);
    return response.data;
  },

  async createSite(payload: { name: string; location: string }): Promise<{ message: string; site: { id: string; name: string; location: string } }> {
    const response = await getApiClient().post("/sites", payload);
    return response.data;
  },

  async createDepartment(payload: { name: string; headId?: string }): Promise<{ message: string; department: { id: string; name: string } }> {
    const response = await getApiClient().post("/departments", payload);
    return response.data;
  },
};
