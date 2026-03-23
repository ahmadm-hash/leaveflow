"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "8px 12px",
        borderRadius: "6px",
        color: isActive ? "#007bff" : "#555",
        backgroundColor: isActive ? "#e8f0fe" : "transparent",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: isActive ? "600" : "400",
        transition: "background 0.15s",
      }}
    >
      {label}
    </Link>
  );
}
