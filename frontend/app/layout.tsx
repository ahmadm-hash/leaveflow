"use client";

import { useEffect } from "react";
import { initializeApiClient } from "./lib/apiClient";
import "./globals.css";
import "./theme.css";

import { Cairo } from "next/font/google";

const cairo = Cairo({ 
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

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
      <body className={cairo.className}>
        {children}
      </body>
    </html>
  );
}
