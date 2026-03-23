"use client";

import { useMemo, useState } from "react";
import { LeaveRequestItem } from "../lib/leaveService";

interface LeaveCalendarProps {
  title: string;
  leaves: LeaveRequestItem[];
  emptyMessage: string;
  accentColor?: string;
}

export function LeaveCalendar({
  title,
  leaves,
  emptyMessage,
  accentColor = "#007bff",
}: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthDays = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: Array<{ iso: string; label: number; inMonth: boolean }> = [];

    for (let index = 0; index < startWeekday; index += 1) {
      days.push({ iso: `pad-${index}`, label: 0, inMonth: false });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      days.push({
        iso: date.toISOString().split("T")[0],
        label: day,
        inMonth: true,
      });
    }

    return days;
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, LeaveRequestItem[]>();

    for (const leave of leaves) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

      while (cursor <= end) {
        const key = cursor.toISOString().split("T")[0];
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(leave);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return map;
  }, [leaves]);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        padding: "20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#222", fontWeight: 700 }}>{title}</h2>
          <div style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
            اضغط على أي يوم لعرض الطلبات المرتبطة به
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={navBtnStyle}>
            ←
          </button>
          <div style={{ minWidth: "170px", textAlign: "center", fontWeight: 600, color: "#333" }}>
            {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={navBtnStyle}>
            →
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} style={{ textAlign: "center", fontSize: "12px", color: "#888", fontWeight: 600 }}>
            {day}
          </div>
        ))}

        {monthDays.map((day) => {
          if (!day.inMonth) {
            return <div key={day.iso} style={{ minHeight: "90px" }} />;
          }

          const events = eventsByDate.get(day.iso) ?? [];
          const isSelected = selectedDate === day.iso;

          return (
            <button
              key={day.iso}
              onClick={() => setSelectedDate(day.iso)}
              style={{
                minHeight: "90px",
                borderRadius: "10px",
                border: `1px solid ${isSelected ? accentColor : "#e5e7eb"}`,
                backgroundColor: isSelected ? `${accentColor}12` : "#fff",
                padding: "10px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, color: "#333", marginBottom: "8px" }}>{day.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {events.slice(0, 3).map((event) => (
                  <span
                    key={`${day.iso}-${event.id}`}
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "999px",
                      backgroundColor: statusColor(event.status).bg,
                      color: statusColor(event.status).color,
                    }}
                  >
                    {event.leaveType}
                  </span>
                ))}
                {events.length > 3 && (
                  <span style={{ fontSize: "10px", color: "#666" }}>+{events.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "18px", borderTop: "1px solid #f0f0f0", paddingTop: "14px" }}>
        {!selectedDate ? (
          <div style={{ color: "#777", fontSize: "13px" }}>{emptyMessage}</div>
        ) : selectedEvents.length === 0 ? (
          <div style={{ color: "#777", fontSize: "13px" }}>لا توجد طلبات في {selectedDate}.</div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {selectedEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  border: "1px solid #ececec",
                  borderRadius: "10px",
                  padding: "12px",
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#222" }}>
                      {event.employee?.fullName ?? event.leaveType}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                      {event.leaveType} · {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: statusColor(event.status).bg,
                      color: statusColor(event.status).color,
                    }}
                  >
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  backgroundColor: "white",
  cursor: "pointer",
};

const statusColor = (status: string) => {
  if (status === "APPROVED_BY_DEPARTMENT_HEAD") return { bg: "#d4edda", color: "#155724" };
  if (status === "APPROVED_BY_SUPERVISOR") return { bg: "#d1ecf1", color: "#0c5460" };
  if (status === "CANCELLATION_REQUESTED") return { bg: "#fff3cd", color: "#856404" };
  if (status === "REJECTED") return { bg: "#f8d7da", color: "#721c24" };
  if (status === "CANCELLED") return { bg: "#e2e3e5", color: "#495057" };
  return { bg: "#eef2ff", color: "#334155" };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}