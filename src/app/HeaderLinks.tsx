"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderLinks() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) {
    return null;
  }
  return (
    <div className="tr">
      <Link href="/scoreboard" className="btn">
        Public Scoreboard
      </Link>
      <Link href="/login" className="btn">
        Sign In
      </Link>
    </div>
  );
}
