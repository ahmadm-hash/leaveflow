"use client";

import { useEffect } from "react";
import { initializeApiClient } from "./app/lib/apiClient";
import "./app/globals.css";
import "./app/theme.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize API client on app load
    initializeApiClient();
  }, []);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "Cairo, Tajawal, Segoe UI, Tahoma, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
