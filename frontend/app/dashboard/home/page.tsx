"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { authService, ManagedUser } from "../../lib/authService";
import { StatusBadge } from "../../components/StatusBadge";
import { LeaveCalendar } from "../../components/LeaveCalendar";
import { Toaster, toast } from "sonner";
import { ROLE_COLORS, theme } from "../../lib/theme";

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
  const canViewPresence = user?.role === "SUPERVISOR" || actsAsDepartmentHead || user?.role === "ADMIN";
  const canSubmitLeave = user?.role === "EMPLOYEE" || user?.role === "SUPERVISOR";
  const canExportReports = actsAsDepartmentHead || user?.role === "ADMIN";

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const retry = async <T,>(fn: () => Promise<T>, attempts = 6): Promise<T> => {
        let lastErr: unknown;
        for (let i = 1; i <= attempts; i += 1) {
          try {
            return await fn();
          } catch (e) {
            lastErr = e;
            if (i < attempts) {
              await new Promise((resolve) => setTimeout(resolve, Math.min(250 * i * i, 2000)));
            }
          }
        }
        throw lastErr;
      };

      try {
        const personalPromise = retry(() => leaveService.getMyLeaveRequests());

        if (canViewPresence) {
          const managerLeavesPromise = retry(() => leaveService.getAllLeaveRequests());
          const managerUsersPromise = actsAsDepartmentHead || user?.role === "ADMIN"
            ? retry(() => authService.getAllUsers())
            : retry(() => authService.getSiteEmployees());

          const [personalResult, managerLeavesResult, managerUsersResult] = await Promise.allSettled([
            personalPromise,
            managerLeavesPromise,
            managerUsersPromise,
          ]);

          if (!isMounted) return;

          if (personalResult.status === "fulfilled") {
            setLeaves(personalResult.value.leaveRequests ?? []);
          } else {
            setLeaves([]);
          }

          if (managerLeavesResult.status === "fulfilled") {
            setManagedLeaves(managerLeavesResult.value.leaveRequests ?? []);
          } else {
            setManagedLeaves([]);
          }

          if (managerUsersResult.status === "fulfilled") {
            setManagedEmployees(
              (managerUsersResult.value.users ?? []).filter(
                (managedUser) => managedUser.role === "EMPLOYEE" && managedUser.isActive !== false && !!managedUser.site
              )
            );
          } else {
            setManagedEmployees([]);
          }

          if (managerLeavesResult.status === "rejected" || managerUsersResult.status === "rejected") {
            toast.error("Some dashboard sections could not be loaded. Data is shown where available.");
          }

          return;
        }

        const personal = await personalPromise;
        if (!isMounted) return;
        setLeaves(personal.leaveRequests ?? []);
      } catch {
      } finally {
        if (isMounted) setLoading(false);
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
    if (!canViewPresence || managedEmployees.length === 0) return null;

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
    if (!canViewPresence || managedEmployees.length === 0) return null;

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

    const onLeaveToday = new Set<string>();
    for (const leave of managedLeaves) {
      if (!approvedStatuses.has(leave.status) || !leave.employee?.id) continue;
      const leaveStart = leave.startDate.slice(0, 10);
      const leaveEnd = leave.endDate.slice(0, 10);
      if (leaveStart <= todayStr && leaveEnd >= todayStr) {
        onLeaveToday.add(leave.employee.id);
      }
    }

    const siteMap = new Map<string, { siteName: string; present: ManagedUser[]; absent: ManagedUser[] }>();
    for (const employee of managedEmployees) {
      if (!employee.site?.id) continue;
      const siteId = employee.site.id;
      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, { siteName: employee.site.name, present: [], absent: [] });
      }
      const bucket = siteMap.get(siteId)!;
      if (onLeaveToday.has(employee.id)) bucket.absent.push(employee);
      else bucket.present.push(employee);
    }

    return Array.from(siteMap.entries())
      .map(([siteId, data]) => ({ siteId, ...data }))
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [actsAsDepartmentHead, user?.role, managedEmployees, managedLeaves]);

  const todayAttendanceSummary = useMemo(() => {
    const sites = todayPresenceRows.length;
    const present = todayPresenceRows.reduce((acc, row) => acc + row.present.length, 0);
    const absent = todayPresenceRows.reduce((acc, row) => acc + row.absent.length, 0);
    const total = present + absent;
    const presentRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { sites, present, absent, presentRate };
  }, [todayPresenceRows]);

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
    if (!stillVisible) setReportEmployeeId("");
  }, [reportEmployeeId, reportEmployees]);

  const dashboardLeaves = canSubmitLeave ? leaves : managedLeaves;
  const roleColor = ROLE_COLORS[user?.role ?? "EMPLOYEE"] ?? theme.colors.navy900;

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
    <div style={{ display: "grid", gap: "24px" }}>
      <Toaster position="top-right" />

      <div
        className="glass-panel hover-lift"
        style={{
          background: `linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 100%)`,
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decorative background glow */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          background: `radial-gradient(circle, ${roleColor}30 0%, transparent 70%)`,
          borderRadius: "50%",
          filter: "blur(30px)",
          zIndex: 0
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 className="heading-gradient" style={{ margin: "0 0 8px 0", fontSize: "34px", letterSpacing: "-0.02em" }}>
            Executive Dashboard
          </h1>
          <p style={{ margin: "0 0 10px 0", color: "var(--rc-ink-900)", fontSize: "16px", fontWeight: "700" }}>
            Welcome back, <span style={{ color: roleColor }}>{user?.fullName?.split(" ")[0]}</span>
          </p>
          <p style={{ margin: 0, color: "var(--rc-ink-700)", fontSize: "14px", fontWeight: "500" }}>
            {user?.role}
            {user?.delegatedDepartmentHead ? " · Delegated Department Head" : ""}
            {user?.site ? ` · ${user.site.name}` : ""}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "24px" }}>
            {canSubmitLeave && user?.annualLeaveBalance !== undefined && (
              <MetricChip label="Annual Leave" value={`${user.annualLeaveBalance}`} color="var(--rc-green-500)" />
            )}
            {weeklyPresencePercentage !== null && (
              <MetricChip label="Weekly Presence" value={`${weeklyPresencePercentage}%`} color="var(--rc-sky-500)" />
            )}
            {monthlyPresencePercentage !== null && (
              <MetricChip label="Monthly Presence" value={`${monthlyPresencePercentage}%`} color="var(--rc-blue-500)" />
            )}
            {(actsAsDepartmentHead || user?.role === "ADMIN") && (
              <MetricChip label="Authority Level" value="Executive" color="var(--rc-bronze-500)" />
            )}
          </div>
        </div>

        <div
          style={{
            borderRadius: "20px",
            padding: "24px",
            color: "white",
            background: `linear-gradient(155deg, ${roleColor}ee 0%, var(--rc-blue-700) 100%)`,
            boxShadow: `0 10px 30px ${roleColor}40`,
            display: "grid",
            alignContent: "space-between",
            minHeight: "180px",
            position: "relative",
            zIndex: 1,
            overflow: "hidden"
          }}
        >
          {/* Subtle overlay inside dark card */}
          <div style={{
            position: "absolute",
            top: 0, right: 0, bottom: 0, left: 0,
            background: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')",
            opacity: 0.5
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "13px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Operational Date</div>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "8px" }}>
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 1, fontSize: "14px", opacity: 0.9, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: loading ? "#ffc107" : "#20cc76", display: "inline-block" }} />
            {loading ? "Syncing live data..." : "All services responding"}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "16px", color: "var(--rc-ink-700)", margin: "0 0 16px 0", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Quick Actions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
          {canSubmitLeave ? (
            <QuickAction href="/dashboard/leaves/new" label="+ New Request" color="var(--rc-navy-900)" />
          ) : (
            <QuickAction href="/dashboard/manage" label="Open Team Review" color="var(--rc-navy-900)" />
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
        <StatCard label="Total Requests" value={stats.total} color="var(--rc-navy-900)" />
        <StatCard label="Pending" value={stats.pending} color="var(--rc-bronze-500)" />
        <StatCard label="Approved" value={stats.approved} color="var(--rc-green-500)" />
        <StatCard label="Rejected" value={stats.rejected} color="var(--rc-danger-600)" />
      </div>

      {(actsAsDepartmentHead || user?.role === "ADMIN") && (sitePresenceRows.length > 0 || todayPresenceRows.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          {sitePresenceRows.length > 0 && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h2 className="heading-gradient" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
                Presence By Site
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table className="brand-table">
                  <thead>
                    <tr>
                      {["Site", "Employees", "Weekly Presence", "Monthly Presence"].map((header) => (
                        <th key={header} style={siteTableHeaderStyle}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sitePresenceRows.map((row) => (
                      <tr key={row.siteId}>
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

          {todayPresenceRows.length > 0 && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 className="heading-gradient" style={{ margin: "0 0 6px 0", fontSize: "18px" }}>
                    Today&apos;s Attendance By Site
                  </h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#8c7a69" }}>
                    {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={summaryPillBlueStyle}>{todayAttendanceSummary.sites} Sites</span>
                  <span style={summaryPillSuccessStyle}>{todayAttendanceSummary.present} Present</span>
                  <span style={summaryPillDangerStyle}>{todayAttendanceSummary.absent} On Leave</span>
                </div>
              </div>

              <div
                style={{
                  height: "8px",
                  borderRadius: "999px",
                  background: "#e5ecfb",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: `${todayAttendanceSummary.presentRate}%`,
                    height: "100%",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #20cc76 0%, #4cc4ff 100%)",
                    transition: "width 240ms ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                {todayPresenceRows.map((row) => (
                  <div key={row.siteId} style={sitePresenceCardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1d2751" }}>🏗️ {row.siteName}</span>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span style={pillSuccessStyle}>✅ {row.present.length} Present</span>
                        {row.absent.length > 0 && (
                          <span style={pillDangerStyle}>🏖️ {row.absent.length} On Leave</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {row.present.map((emp) => (
                        <div key={emp.id} style={employeePresentChipStyle}>
                          <span style={presentDotStyle} />
                          {emp.fullName}
                        </div>
                      ))}
                      {row.absent.length > 0 && (
                        row.absent.map((emp) => (
                          <div key={emp.id} style={employeeAbsentChipStyle}>
                            <span style={absentDotStyle} />
                            {emp.fullName}
                          </div>
                        ))
                      )}
                      {row.present.length === 0 && row.absent.length > 0 && (
                        <span style={siteHintTextStyle}>No one present in this site today.</span>
                      )}
                      {row.absent.length === 0 && (
                        <span style={siteHintTextStyle}>No one on leave from this site today.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {canExportReports && (
        <div className="surface-card" style={{ padding: "20px" }}>
          <h2 style={{ margin: "0 0 14px 0", fontSize: "16px", color: "#052976", fontWeight: "700" }}>
            Excel Report
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={reportLabelStyle}>From Date</label>
              <input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} style={reportInputStyle} />
            </div>
            <div>
              <label style={reportLabelStyle}>To Date</label>
              <input type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} style={reportInputStyle} />
            </div>
            <div>
              <label style={reportLabelStyle}>Site</label>
              <select value={reportSiteId} onChange={(event) => setReportSiteId(event.target.value)} style={reportInputStyle}>
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
              <select value={reportEmployeeId} onChange={(event) => setReportEmployeeId(event.target.value)} style={reportInputStyle}>
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
            className="brand-btn brand-btn-primary hover-lift"
            onClick={handleExportExcel}
            disabled={exportingReport}
            style={{
              backgroundColor: "#20cc76",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "11px 16px",
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

      <div style={{ display: "grid", gap: "20px" }}>
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
            accentColor="#8142ff"
          />
        )}
      </div>

      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 className="heading-gradient" style={{ margin: 0, fontSize: "18px" }}>
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
            <div style={{ color: "#6f6a63", fontSize: "14px", marginBottom: "12px" }}>
              {canSubmitLeave ? "No leave requests yet." : "No team leave requests found."}
            </div>
            {canSubmitLeave ? (
              <Link href="/dashboard/leaves/new" className="brand-btn brand-btn-primary hover-lift" style={emptyStateActionStyle}>
                Submit your first request
              </Link>
            ) : (
              <Link href="/dashboard/manage" className="brand-btn brand-btn-primary hover-lift" style={emptyStateActionStyle}>
                Open review queue
              </Link>
            )}
          </div>
        ) : (
          <table className="brand-table">
            <thead>
              <tr>
                {["Employee", "Site", "Type", "Start", "End", "Status"].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      color: "#8c7a69",
                      fontWeight: "500",
                      borderBottom: "1px solid #ebe1d2",
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
                  <td style={{ padding: "10px 12px", color: "#1d2751", fontWeight: "500" }}>{leave.employee?.fullName ?? "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#6f6a63" }}>{leave.site?.name ?? "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#1d2751", fontWeight: "500" }}>{leave.leaveType}</td>
                  <td style={{ padding: "10px 12px", color: "#6f6a63" }}>{formatDate(leave.startDate)}</td>
                  <td style={{ padding: "10px 12px", color: "#6f6a63" }}>{formatDate(leave.endDate)}</td>
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
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: "white",
        padding: "14px 16px",
        borderRadius: "14px",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: "700",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "48px",
        boxShadow: `0 8px 20px ${color}30`,
        transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 24px ${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = `0 8px 20px ${color}30`;
      }}
    >
      {label}
    </Link>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="glass-panel-hover"
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        padding: "20px",
        textAlign: "center",
        position: "relative",
        boxShadow: "0 8px 25px rgba(5, 41, 118, 0.04)",
        overflow: "hidden",
        transition: "all 0.3s ease"
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
      <div style={{ fontSize: "32px", fontWeight: "800", color, textShadow: `0 2px 10px ${color}20` }}>{value}</div>
      <div style={{ fontSize: "13px", color: "var(--rc-ink-700)", marginTop: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

function MetricChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="glass-panel-hover"
      style={{
        background: "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(8px)",
        border: `1px solid rgba(255, 255, 255, 0.8)`,
        borderRadius: "14px",
        padding: "12px 16px",
        boxShadow: "0 4px 15px rgba(5, 41, 118, 0.03)",
        borderLeft: `4px solid ${color}`,
        flex: "1 1 min-content"
      }}
    >
      <div style={{ fontSize: "11px", color: "var(--rc-ink-700)", marginBottom: "4px", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 800, color, textShadow: `0 2px 10px ${color}20` }}>{value}</div>
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
  const totalDays = Math.max(0, Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1);
  const totalEmployeeDays = employees.length * totalDays;

  if (totalEmployeeDays === 0) return 0;

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

    if (effectiveEnd < effectiveStart) continue;

    effectiveStart.setHours(0, 0, 0, 0);
    effectiveEnd.setHours(0, 0, 0, 0);

    for (const current = new Date(effectiveStart); current <= effectiveEnd; current.setDate(current.getDate() + 1)) {
      leaveDays.add(`${leave.employee.id}:${current.toISOString().slice(0, 10)}`);
    }
  }

  return Math.max(0, Math.round(((totalEmployeeDays - leaveDays.size) / totalEmployeeDays) * 100));
}

const siteTableHeaderStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "#6f6a63",
  fontWeight: 600,
  borderBottom: "2px solid #dcc8b6",
  whiteSpace: "nowrap",
  fontSize: "13px",
};

const siteTableCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "#1d2751",
};

const reportLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#6f6a63",
  marginBottom: "5px",
};

const reportInputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #dcc8b6",
  borderRadius: "10px",
  padding: "10px 11px",
  fontSize: "13px",
  color: "#1d2751",
  backgroundColor: "white",
};

const emptyStateActionStyle: React.CSSProperties = {
  backgroundColor: "#052976",
  color: "white",
  padding: "9px 20px",
  borderRadius: "10px",
  textDecoration: "none",
  fontSize: "14px",
};

const pillSuccessStyle: React.CSSProperties = {
  backgroundColor: "#daf7ea",
  color: "#0a9d76",
  borderRadius: "999px",
  padding: "3px 10px",
  fontSize: "12px",
  fontWeight: 600,
};

const pillDangerStyle: React.CSSProperties = {
  backgroundColor: "#f8d7da",
  color: "#721c24",
  borderRadius: "999px",
  padding: "3px 10px",
  fontSize: "12px",
  fontWeight: 600,
};

const employeePresentChipStyle: React.CSSProperties = {
  backgroundColor: "#f2fbf6",
  border: "1px solid #b7e8d3",
  borderRadius: "10px",
  padding: "7px 12px",
  fontSize: "13px",
  color: "#0a9d76",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const employeeAbsentChipStyle: React.CSSProperties = {
  backgroundColor: "#fff5f5",
  border: "1px solid #f5c2c7",
  borderRadius: "10px",
  padding: "7px 12px",
  fontSize: "13px",
  color: "#842029",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const presentDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#20cc76",
  display: "inline-block",
};

const absentDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#dc3545",
  display: "inline-block",
};

const summaryPillBlueStyle: React.CSSProperties = {
  background: "#e8f0ff",
  color: "#103576",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const summaryPillSuccessStyle: React.CSSProperties = {
  background: "#daf7ea",
  color: "#0a9d76",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const summaryPillDangerStyle: React.CSSProperties = {
  background: "#fce8ea",
  color: "#842029",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const sitePresenceCardStyle: React.CSSProperties = {
  border: "1px solid #dde8fb",
  borderRadius: "14px",
  background: "linear-gradient(145deg, #ffffff 0%, #f7faff 100%)",
  padding: "12px",
};

const siteHintTextStyle: React.CSSProperties = {
  color: "#7f8ab0",
  fontSize: "12px",
  fontWeight: 500,
};
