"use client";

import { useEffect } from "react";
import { initializeApiClient } from "./app/lib/apiClient";

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
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
