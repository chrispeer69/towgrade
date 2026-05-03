"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin",        label: "Verification Queue" },
  { href: "/admin/admins", label: "Manage Admins" },
  { href: "/admin/audit",  label: "Audit Log" },
] as const;

export default function AdminTabs() {
  const path = usePathname() ?? "/admin";

  return (
    <nav className="rtabs admin-tabs" aria-label="Admin sections">
      {TABS.map((t) => {
        // /admin matches only itself (not /admin/admins or /admin/audit).
        // /admin/admins and /admin/audit match prefix in case nested
        // routes are added later.
        const active =
          t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rtab ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
