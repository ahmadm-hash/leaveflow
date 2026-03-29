import { getApiClient } from "./apiClient";

export interface LeaveRequestPayload {
  startDate: string;
  endDate: string;
  leaveType: "ANNUAL" | "SICK" | "UNPAID";
  reason?: string;
  documentUrl?: string;
}

export interface LeaveRequestItem {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: "ANNUAL" | "SICK" | "UNPAID";
  status: string;
  statusBeforeCancellation?: string | null;
  reason?: string;
  documentUrl?: string;
  createdAt?: string;
  employee?: { id: string; fullName: string; username: string; role?: string };
  department?: { id: string; name: string };
  site?: { id: string; name: string };
  leaveReview?: { id: string; comment: string | null; reviewedAt: string; role: string }[];
}

export interface Department {
  id: string;
  name: string;
  headId?: string | null;
  head?: { id: string; fullName: string } | null;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  supervisorId?: string | null;
  supervisor?: { id: string; fullName: string } | null;
}

export const leaveService = {
  async createLeaveRequest(payload: LeaveRequestPayload) {
    const response = await getApiClient().post("/leaves", payload);
    return response.data;
  },

  async getMyLeaveRequests(): Promise<{ leaveRequests: LeaveRequestItem[] }> {
    const response = await getApiClient().get("/leaves/my");
    return response.data;
  },

  async getAllLeaveRequests(): Promise<{ leaveRequests: LeaveRequestItem[] }> {
    const response = await getApiClient().get("/leaves/all");
    return response.data;
  },

  async cancelLeaveRequest(leaveRequestId: string) {
    const response = await getApiClient().put(`/leaves/${leaveRequestId}/cancel`);
    return response.data;
  },

  async reviewLeaveRequest(leaveRequestId: string, action: "approve" | "reject", comment?: string) {
    const response = await getApiClient().post(`/leaves/${leaveRequestId}/review`, { action, comment });
    return response.data;
  },

  async downloadSignedLeavePdf(leaveRequestId: string): Promise<{ blob: Blob; fileName: string }> {
    const response = await getApiClient().get(`/leaves/${leaveRequestId}/signed-pdf`, {
      responseType: "blob",
    });

    const disposition = response.headers["content-disposition"] as string | undefined;
    const matched = disposition?.match(/filename=\"?([^\";]+)\"?/i);
    const fileName = matched?.[1] ?? `leave-${leaveRequestId}.pdf`;

    return { blob: response.data as Blob, fileName };
  },

  async getDepartments(): Promise<{ departments: Department[] }> {
    const response = await getApiClient().get("/departments");
    return response.data;
  },

  async getSites(): Promise<{ sites: Site[] }> {
    const response = await getApiClient().get("/sites");
    return response.data;
  },
};

