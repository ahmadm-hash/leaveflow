"use client";

import { useMemo, useState } from "react";
import { LeaveRequestItem } from "../lib/leaveService";
import styles from "./LeaveCalendar.module.css";

interface LeaveCalendarProps {
  title: string;
  leaves: LeaveRequestItem[];
  emptyMessage: string;
  accentColor?: string;
  visualStyle?: "default" | "supervisor";
}

export function LeaveCalendar({
  title,
  leaves,
  emptyMessage,
  accentColor = "#052976",
  visualStyle = "default",
}: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const todayIso = new Date().toISOString().split("T")[0];
  const isSupervisorView = visualStyle === "supervisor";

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
  const pendingCount = leaves.filter((leave) => leave.status.includes("PENDING")).length;
  const approvedCount = leaves.filter((leave) => leave.status.startsWith("APPROVED")).length;
  const rejectedCount = leaves.filter((leave) => leave.status === "REJECTED").length;
  const accentClass = accentColor.toLowerCase() === "#8142ff" ? styles.accentViolet : "";

  return (
    <div className={`${styles.panel} ${accentClass} ${isSupervisorView ? styles.supervisor : ""}`}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.subtitle}>
            Click any day to view linked requests
          </div>
        </div>
        <div className={styles.controlRow}>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className={styles.navBtn}
            aria-label="Previous month"
          >
            ←
          </button>
          <div className={styles.monthLabel}>
            {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className={styles.navBtn}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {isSupervisorView && (
        <div className={styles.stats}>
          <span className={`${styles.statChip} ${styles.statPending}`}>Pending: {pendingCount}</span>
          <span className={`${styles.statChip} ${styles.statApproved}`}>Approved: {approvedCount}</span>
          <span className={`${styles.statChip} ${styles.statRejected}`}>Rejected: {rejectedCount}</span>
        </div>
      )}

      <div className={styles.gridWrap}>
        <div className={styles.grid}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}

        {monthDays.map((day) => {
          if (!day.inMonth) {
            return <div key={day.iso} className={styles.emptyPad} />;
          }

          const events = eventsByDate.get(day.iso) ?? [];
          const isSelected = selectedDate === day.iso;
          const isToday = day.iso === todayIso;

          return (
            <button
              key={day.iso}
              onClick={() => setSelectedDate(day.iso)}
              className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ""} ${isToday ? styles.today : ""}`}
              aria-label={`Day ${day.label}, ${events.length} events`}
            >
              <div className={styles.dayHeader}>
                <span className={styles.dayNumber}>{day.label}</span>
                {events.length > 0 && <span className={styles.eventCount}>{events.length}</span>}
              </div>
              <div className={styles.pills}>
                {events.slice(0, 3).map((event) => (
                  <span
                    key={`${day.iso}-${event.id}`}
                    className={`${styles.pill} ${statusToneClass(event.status, styles)}`}
                  >
                    {event.leaveType}
                  </span>
                ))}
                {events.length > 3 && (
                  <span className={styles.moreCount}>+{events.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <div className={styles.details}>
        {!selectedDate ? (
          <div className={styles.emptyMessage}>{emptyMessage}</div>
        ) : selectedEvents.length === 0 ? (
          <div className={styles.emptyMessage}>No requests on {selectedDate}.</div>
        ) : (
          <div className={styles.eventList}>
            {selectedEvents.map((event) => (
              <div key={event.id} className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <div>
                    <div className={styles.eventName}>
                      {event.employee?.fullName ?? event.leaveType}
                    </div>
                    <div className={styles.eventMeta}>
                      {event.leaveType} · {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </div>
                  </div>
                  <span
                    className={`${styles.status} ${statusToneClass(event.status, styles)}`}
                  >
                    {event.status.replace(/_/g, " ")}
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

function statusToneClass(status: string, styleMap: Record<string, string>) {
  if (status === "APPROVED_BY_DEPARTMENT_HEAD") return styleMap.toneApproved;
  if (status === "APPROVED_BY_SUPERVISOR") return styleMap.toneApprovedSupervisor;
  if (status.includes("PENDING")) return styleMap.tonePending;
  if (status === "CANCELLATION_REQUESTED") return styleMap.toneCancelRequested;
  if (status === "REJECTED") return styleMap.toneRejected;
  if (status === "CANCELLED") return styleMap.toneCancelled;
  return styleMap.toneApprovedSupervisor;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}