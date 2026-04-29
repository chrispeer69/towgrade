"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./actions";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/rate", label: "Rate a provider" },
  { href: "/dashboard/reviews", label: "My reviews" },
  { href: "/dashboard/account", label: "Account" },
];

type Props = {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  children: React.ReactNode;
};

export default function DashboardNav({
  firstName,
  lastName,
  companyName,
  children,
}: Props) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <>
      <nav className="dash-tabs" aria-label="Dashboard sections">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`dash-tabs__item${isActive(item.href) ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="dash-frame">
        <aside className="dash-rail" aria-label="Dashboard navigation">
          <div className="dash-rail__user">
            {fullName && (
              <div className="dash-rail__user-name">{fullName}</div>
            )}
            {companyName && (
              <div className="dash-rail__user-co">{companyName}</div>
            )}
          </div>
          <div className="dash-rail__nav">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`dash-rail__item${isActive(item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form action={signOut} className="dash-rail__signout">
            <button type="submit" className="btn">
              Sign out
            </button>
          </form>
        </aside>
        <main className="dash-main">{children}</main>
      </div>
    </>
  );
}
