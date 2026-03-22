import { getApiClient } from "./apiClient";

export interface LeaveRequestPayload {
  startDate: string;
  endDate: string;
  leaveType: "ANNUAL" | "SICK" | "COMPASSIONATE" | "UNPAID";
  departmentId: string;
  reason?: string;
}

export const leaveService = {
  async createLeaveRequest(payload: LeaveRequestPayload) {
    const response = await getApiClient().post("/leaves", payload);
    return response.data;
  },

  async getMyLeaveRequests() {
    const response = await getApiClient().get("/leaves/my");
    return response.data;
  },

  async cancelLeaveRequest(leaveRequestId: string) {
    const response = await getApiClient().put(`/leaves/${leaveRequestId}/cancel`);
    return response.data;
  },
};
