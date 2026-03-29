"use client";

import { useEffect } from "react";
import { initializeApiClient } from "./lib/apiClient";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
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
