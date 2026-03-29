"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { authService, ManagedUser } from "../../lib/authService";
import { StatusBadge } from "../../components/StatusBadge";
import { LeaveCalendar } from "../../components/LeaveCalendar";
import { Toaster, toast } from "sonner";

export default function DashboardHome() {
  const user = useAuthStore((state) => state.user);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [managedLeaves, setManagedLeaves] = useState<LeaveRequestItem[]>([]);
  const [managedEmployees, setManagedEmployees] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingReport, setExportingReport] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const now = new Date();
    return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [reportEndDate, setReportEndDate] = useState(() => toInputDate(new Date()));
  const [reportSiteId, setReportSiteId] = useState("");
  const [reportEmployeeId, setReportEmployeeId] = useState("");

  const actsAsDepartmentHead = user?.role === "DEPARTMENT_HEAD" || user?.delegatedDepartmentHead;
  const canViewPresence =
    user?.role === "SUPERVISOR" || actsAsDepartmentHead || user?.role === "ADMIN";
  const canSubmitLeave = user?.role === "EMPLOYEE" || user?.role === "SUPERVISOR";
  const canExportReports = actsAsDepartmentHead || user?.role === "ADMIN";

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const retry = async <T,>(fn: () => Promise<T>, attempts = 6): Promise<T> => {
        let lastErr: unknown;
        for (let i = 1; i <= attempts; i++) {
          try { return await fn(); } catch (e) {
            lastErr = e;
            if (i < attempts) await new Promise((r) => setTimeout(r, Math.min(250 * i * i, 2000)));
          }
        }
        throw lastErr;
      };

      try {
        const personalPromise = retry(() => leaveService.getMyLeaveRequests());
        const managerPromise = !canViewPresence
          ? Promise.resolve(null)
          : actsAsDepartmentHead || user?.role === "ADMIN"
            ? Promise.all([
                retry(() => leaveService.getAllLeaveRequests()),
                retry(() => authService.getAllUsers()),
              ])
            : Promise.all([
                retry(() => leaveService.getAllLeaveRequests()),
                retry(() => authService.getSiteEmployees()),
              ]);

        const personal = await personalPromise;
        if (!isMounted) return;
        setLeaves(personal.leaveRequests ?? []);

        if (managerPromise) {
          const managerData = await managerPromise;
          if (!isMounted || !managerData) return;
          setManagedLeaves(managerData[0].leaveRequests ?? []);
          setManagedEmployees(
            (managerData[1].users ?? []).filter(
              (managedUser) => managedUser.role === "EMPLOYEE" && managedUser.isActive !== false && !!managedUser.site
            )
          );
        }
      } catch {
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [actsAsDepartmentHead, canViewPresence, user?.role]);

  const isManager =
    user?.role === "SUPERVISOR" || user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";

  const weeklyPresencePercentage = useMemo(() => {
    if (!canViewPresence || managedEmployees.length === 0) {
      return null;
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return calculatePresencePercentage(managedEmployees, managedLeaves, weekStart, weekEnd);
  }, [canViewPresence, managedEmployees, managedLeaves]);

  const monthlyPresencePercentage = useMemo(() => {
    if (!canViewPresence || managedEmployees.length === 0) {
      return null;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return calculatePresencePercentage(managedEmployees, managedLeaves, monthStart, monthEnd);
  }, [canViewPresence, managedEmployees, managedLeaves]);

  const sitePresenceRows = useMemo(() => {
    if (!canViewPresence || managedEmployees.length === 0) {
      return [] as Array<{ siteId: string; siteName: string; weekly: number; monthly: number; employees: number }>;
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const employeesBySite = new Map<string, { siteName: string; employees: ManagedUser[] }>();
    for (const employee of managedEmployees) {
      if (!employee.site?.id) continue;
      const siteId = employee.site.id;
      const current = employeesBySite.get(siteId);
      if (!current) {
        employeesBySite.set(siteId, { siteName: employee.site.name, employees: [employee] });
      } else {
        current.employees.push(employee);
      }
    }

    const leavesBySite = new Map<string, LeaveRequestItem[]>();
    for (const leave of managedLeaves) {
      const siteId = leave.site?.id;
      if (!siteId) continue;
      const current = leavesBySite.get(siteId) ?? [];
      current.push(leave);
      leavesBySite.set(siteId, current);
    }

    return Array.from(employeesBySite.entries())
      .map(([siteId, data]) => {
        const leavesForSite = leavesBySite.get(siteId) ?? [];
        return {
          siteId,
          siteName: data.siteName,
          employees: data.employees.length,
          weekly: calculatePresencePercentage(data.employees, leavesForSite, weekStart, weekEnd),
          monthly: calculatePresencePercentage(data.employees, leavesForSite, monthStart, monthEnd),
        };
      })
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [canViewPresence, managedEmployees, managedLeaves]);

  const todayPresenceRows = useMemo(() => {
    if (!actsAsDepartmentHead && user?.role !== "ADMIN") return [];
    if (managedEmployees.length === 0) return [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const approvedStatuses = new Set(["APPROVED_BY_SUPERVISOR", "APPROVED_BY_DEPARTMENT_HEAD"]);

    // Build set of employeeId who are on approved leave today
    const onLeaveToday = new Set<string>();
    for (const leave of managedLeaves) {
      if (!approvedStatuses.has(leave.status) || !leave.employee?.id) continue;
      const leaveStart = leave.startDate.slice(0, 10);
      const leaveEnd = leave.endDate.slice(0, 10);
      if (leaveStart <= todayStr && leaveEnd >= todayStr) {
        onLeaveToday.add(leave.employee.id);
      }
    }

    // Group employees by site
    const siteMap = new Map<string, { siteName: string; present: ManagedUser[]; absent: ManagedUser[] }>();
    for (const employee of managedEmployees) {
      if (!employee.site?.id) continue;
      const siteId = employee.site.id;
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, { siteName: employee.site.name, present: [], absent: [] });
      }
      const bucket = siteMap.get(siteId)!;
      if (onLeaveToday.has(employee.id)) {
        bucket.absent.push(employee);
      } else {
        bucket.present.push(employee);
      }
    }

    return Array.from(siteMap.entries())
      .map(([siteId, data]) => ({ siteId, ...data }))
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [actsAsDepartmentHead, user?.role, managedEmployees, managedLeaves]);

  const reportSites = useMemo(() => {
    const siteMap = new Map<string, string>();
    for (const employee of managedEmployees) {
      if (employee.site?.id && employee.site?.name) {
        siteMap.set(employee.site.id, employee.site.name);
      }
    }
    return Array.from(siteMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [managedEmployees]);

  const reportEmployees = useMemo(() => {
    const filtered = reportSiteId
      ? managedEmployees.filter((employee) => employee.site?.id === reportSiteId)
      : managedEmployees;

    return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [managedEmployees, reportSiteId]);

  useEffect(() => {
    if (!reportEmployeeId) return;
    const stillVisible = reportEmployees.some((employee) => employee.id === reportEmployeeId);
    if (!stillVisible) {
      setReportEmployeeId("");
    }
  }, [reportEmployeeId, reportEmployees]);

  const dashboardLeaves = canSubmitLeave ? leaves : managedLeaves;

  const roleColors: Record<string, string> = {
    EMPLOYEE: "#20cc76",
    SUPERVISOR: "#2633ff",
    DEPARTMENT_HEAD: "#052976",
    ADMIN: "#8142ff",
  };
  const roleColor = roleColors[user?.role ?? "EMPLOYEE"] ?? "#052976";

  const stats = {
    total: dashboardLeaves.length,
    pending: dashboardLeaves.filter((leave) => leave.status === "PENDING").length,
    approved: dashboardLeaves.filter((leave) => leave.status === "APPROVED_BY_DEPARTMENT_HEAD").length,
    rejected: dashboardLeaves.filter((leave) => leave.status === "REJECTED").length,
  };

  const recentLeaves = dashboardLeaves.slice(0, 5);

  const handleExportExcel = async () => {
    if (!canExportReports) {
      toast.error("You do not have permission to export reports");
      return;
    }

    if (!reportStartDate || !reportEndDate) {
      toast.error("Please select start and end dates");
      return;
    }

    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      toast.error("Invalid date range");
      return;
    }

    const reportLeaves = managedLeaves
      .filter((leave) => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        const overlapsRange = leaveStart <= end && leaveEnd >= start;
        if (!overlapsRange) return false;
        if (reportSiteId && leave.site?.id !== reportSiteId) return false;
        if (reportEmployeeId && leave.employee?.id !== reportEmployeeId) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (reportLeaves.length === 0) {
      toast.error("No leave data found for the selected filters");
      return;
    }

    setExportingReport(true);
    try {
      const XLSX = await import("xlsx");
      const rows = reportLeaves.map((leave) => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return {
          Employee: leave.employee?.fullName ?? "-",
          Username: leave.employee?.username ?? "-",
          Site: leave.site?.name ?? "-",
          LeaveType: leave.leaveType,
          Status: leave.status,
          StartDate: formatDate(leave.startDate),
          EndDate: formatDate(leave.endDate),
          Days: getInclusiveDays(leaveStart, leaveEnd),
          Reason: leave.reason ?? "",
          CreatedAt: leave.createdAt ? formatDate(leave.createdAt) : "-",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Report");

      const fileName = `leave-report-${reportStartDate}-to-${reportEndDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success("Excel report exported");
    } catch {
      toast.error("Failed to export Excel report");
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div
        style={{
          background: `linear-gradient(135deg, ${roleColor}18 0%, #ffffff 48%, #f4eee9 100%)`,
          border: `1px solid ${roleColor}30`,
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ margin: "0 0 4px 0", fontSize: "22px", color: "#333" }}>
          Welcome back, {user?.fullName?.split(" ")[0]}!
        </h1>
        <p style={{ margin: "0 0 16px 0", color: "#666", fontSize: "14px" }}>
          {user?.role}
          {user?.delegatedDepartmentHead ? " · Delegated Department Head" : ""}
          {user?.site ? ` · ${user.site.name}` : ""}
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {canSubmitLeave && user?.annualLeaveBalance !== undefined && (
            <MetricChip label="Annual Leave Left" value={`${user.annualLeaveBalance}`} color="#20cc76" />
          )}
          {weeklyPresencePercentage !== null && (
            <MetricChip label="Weekly Presence" value={`${weeklyPresencePercentage}%`} color="#4cc4ff" />
          )}
          {monthlyPresencePercentage !== null && (
            <MetricChip label="Monthly Presence" value={`${monthlyPresencePercentage}%`} color="#2633ff" />
          )}
          {actsAsDepartmentHead && (
            <MetricChip label="Delegated Authority" value="Enabled" color="#bc9470" />
          )}
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", color: "#555", margin: "0 0 12px 0", fontWeight: "600" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {canSubmitLeave ? (
            <QuickAction href="/dashboard/leaves/new" label="+ New Leave Request" color="#052976" />
          ) : (
            <QuickAction href="/dashboard/manage" label="Open Team Review" color="#052976" />
          )}
          <QuickAction href="/dashboard/leaves" label={canSubmitLeave ? "View My Leaves" : "View Leave Log"} color="#6c757d" />
          {isManager && <QuickAction href="/dashboard/manage" label="Review Leaves" color="#20cc76" />}
          {isManager && <QuickAction href="/dashboard/users" label="Manage Users" color="#8142ff" />}
          {(actsAsDepartmentHead || user?.role === "ADMIN") && (
            <QuickAction href="/dashboard/sites" label="Manage Sites" color="#4cc4ff" />
          )}
          <QuickAction href="/dashboard/profile" label="Edit Profile" color="#bc9470" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard label="Total Requests" value={stats.total} color="#103576" />
        <StatCard label="Pending" value={stats.pending} color="#bc9470" />
        <StatCard label="Approved" value={stats.approved} color="#20cc76" />
        <StatCard label="Rejected" value={stats.rejected} color="#dc3545" />
      </div>

      {(actsAsDepartmentHead || user?.role === "ADMIN") && sitePresenceRows.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "10px",
            border: "1px solid #e0e0e0",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 14px 0", fontSize: "16px", color: "#333", fontWeight: "600" }}>
            Presence By Site
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  {[
                    "Site",
                    "Employees",
                    "Weekly Presence",
                    "Monthly Presence",
                  ].map((header) => (
                    <th key={header} style={siteTableHeaderStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sitePresenceRows.map((row) => (
                  <tr key={row.siteId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={siteTableCellStyle}>{row.siteName}</td>
                    <td style={siteTableCellStyle}>{row.employees}</td>
                    <td style={siteTableCellStyle}>{row.weekly}%</td>
                    <td style={siteTableCellStyle}>{row.monthly}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(actsAsDepartmentHead || user?.role === "ADMIN") && todayPresenceRows.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "10px",
            border: "1px solid #e0e0e0",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#333", fontWeight: "600" }}>
            Today&apos;s Attendance By Site
          </h2>
          <p style={{ margin: "0 0 14px 0", fontSize: "12px", color: "#888" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {todayPresenceRows.map((row) => (
              <div key={row.siteId}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>🏗️ {row.siteName}</span>
                  <span style={{
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    borderRadius: "12px",
                    padding: "2px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}>
                    ✅ {row.present.length} Present
                  </span>
                  {row.absent.length > 0 && (
                    <span style={{
                      backgroundColor: "#f8d7da",
                      color: "#721c24",
                      borderRadius: "12px",
                      padding: "2px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}>
                      🏖️ {row.absent.length} On Leave
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {row.present.map((emp) => (
                    <div key={emp.id} style={{
                      backgroundColor: "#f0fff4",
                      border: "1px solid #b7ebc8",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "13px",
                      color: "#1a6334",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#28a745", display: "inline-block" }} />
                      {emp.fullName}
                    </div>
                  ))}
                  {row.absent.map((emp) => (
                    <div key={emp.id} style={{
                      backgroundColor: "#fff5f5",
                      border: "1px solid #f5c2c7",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "13px",
                      color: "#842029",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#dc3545", display: "inline-block" }} />
                      {emp.fullName}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canExportReports && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "10px",
            border: "1px solid #e0e0e0",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: "0 0 14px 0", fontSize: "16px", color: "#333", fontWeight: "600" }}>
            Excel Report
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={reportLabelStyle}>From Date</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(event) => setReportStartDate(event.target.value)}
                style={reportInputStyle}
              />
            </div>
            <div>
              <label style={reportLabelStyle}>To Date</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(event) => setReportEndDate(event.target.value)}
                style={reportInputStyle}
              />
            </div>
            <div>
              <label style={reportLabelStyle}>Site</label>
              <select
                value={reportSiteId}
                onChange={(event) => setReportSiteId(event.target.value)}
                style={reportInputStyle}
              >
                <option value="">All Sites</option>
                {reportSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={reportLabelStyle}>Employee</label>
              <select
                value={reportEmployeeId}
                onChange={(event) => setReportEmployeeId(event.target.value)}
                style={reportInputStyle}
              >
                <option value="">All Employees</option>
                {reportEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingReport}
            style={{
              backgroundColor: "#198754",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: exportingReport ? "not-allowed" : "pointer",
              opacity: exportingReport ? 0.7 : 1,
            }}
          >
            {exportingReport ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: "24px", marginBottom: "24px" }}>
        {canSubmitLeave && (
          <LeaveCalendar
            title="My Interactive Calendar"
            leaves={leaves}
            emptyMessage="Select a day from the calendar to review your personal leaves."
            accentColor={roleColor}
          />
        )}

        {user?.role === "SUPERVISOR" && (
          <LeaveCalendar
            title="Site Interactive Calendar"
            leaves={managedLeaves}
            emptyMessage="Select a day to review leave requests for employees in your site."
            accentColor="#6f42c1"
          />
        )}
      </div>

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          border: "1px solid #e0e0e0",
          padding: "20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", color: "#333", fontWeight: "600" }}>
            {canSubmitLeave ? "Recent Leave Requests" : "Recent Team Leave Requests"}
          </h2>
          <Link href={canSubmitLeave ? "/dashboard/leaves" : "/dashboard/manage"} style={{ color: "#052976", fontSize: "13px", textDecoration: "none" }}>
            View all
          </Link>
        </div>

        {loading ? (
          <div style={{ color: "#999", fontSize: "14px", padding: "20px 0", textAlign: "center" }}>Loading...</div>
        ) : recentLeaves.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
            <div style={{ color: "#666", fontSize: "14px", marginBottom: "12px" }}>
              {canSubmitLeave ? "No leave requests yet." : "No team leave requests found."}
            </div>
            {canSubmitLeave ? (
              <Link
                href="/dashboard/leaves/new"
                style={{
                  backgroundColor: "#052976",
                  color: "white",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Submit your first request
              </Link>
            ) : (
              <Link
                href="/dashboard/manage"
                style={{
                  backgroundColor: "#052976",
                  color: "white",
                  padding: "8px 20px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Open review queue
              </Link>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                {["Employee", "Site", "Type", "Start", "End", "Status"].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      color: "#888",
                      fontWeight: "500",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "12px",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeaves.map((leave) => (
                <tr key={leave.id}>
                  <td style={{ padding: "10px 12px", color: "#333", fontWeight: "500" }}>{leave.employee?.fullName ?? "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{leave.site?.name ?? "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#333", fontWeight: "500" }}>{leave.leaveType}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{formatDate(leave.startDate)}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{formatDate(leave.endDate)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge status={leave.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: color,
        color: "white",
        padding: "9px 18px",
        borderRadius: "8px",
        textDecoration: "none",
        fontSize: "13px",
        fontWeight: "500",
        display: "inline-block",
      }}
    >
      {label}
    </Link>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        padding: "16px",
        textAlign: "center",
        borderTop: `3px solid ${color}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "26px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>{label}</div>
    </div>
  );
}

function MetricChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: `1px solid ${color}30`,
        borderRadius: "10px",
        padding: "10px 14px",
        minWidth: "140px",
      }}
    >
      <div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInclusiveDays(startDate: Date, endDate: Date) {
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function calculatePresencePercentage(
  employees: ManagedUser[],
  leaves: LeaveRequestItem[],
  periodStart: Date,
  periodEnd: Date
) {
  const totalDays = Math.max(
    0,
    Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1
  );
  const totalEmployeeDays = employees.length * totalDays;

  if (totalEmployeeDays === 0) {
    return 0;
  }

  const employeeIds = new Set(employees.map((employee) => employee.id));
  const approvedStatuses = new Set(["APPROVED_BY_SUPERVISOR", "APPROVED_BY_DEPARTMENT_HEAD"]);
  const leaveDays = new Set<string>();

  for (const leave of leaves) {
    if (!approvedStatuses.has(leave.status) || !leave.employee?.id || !employeeIds.has(leave.employee.id)) {
      continue;
    }

    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    const effectiveStart = new Date(Math.max(leaveStart.getTime(), periodStart.getTime()));
    const effectiveEnd = new Date(Math.min(leaveEnd.getTime(), periodEnd.getTime()));

    if (effectiveEnd < effectiveStart) {
      continue;
    }

    effectiveStart.setHours(0, 0, 0, 0);
    effectiveEnd.setHours(0, 0, 0, 0);

    for (
      const current = new Date(effectiveStart);
      current <= effectiveEnd;
      current.setDate(current.getDate() + 1)
    ) {
      leaveDays.add(`${leave.employee.id}:${current.toISOString().slice(0, 10)}`);
    }
  }

  return Math.max(0, Math.round(((totalEmployeeDays - leaveDays.size) / totalEmployeeDays) * 100));
}

const siteTableHeaderStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "#555",
  fontWeight: 600,
  borderBottom: "2px solid #e0e0e0",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const siteTableCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "#333",
};

const reportLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#666",
  marginBottom: "5px",
};

const reportInputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d9d9d9",
  borderRadius: "7px",
  padding: "9px 10px",
  fontSize: "13px",
  color: "#333",
  backgroundColor: "white",
};