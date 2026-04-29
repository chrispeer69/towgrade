"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * HeaderNav — client component so it can read the current pathname.
 *
 * Renders the top-right nav links:
 *   - "Public Scoreboard" → /scoreboard  (always visible on public pages)
 *   - "Sign In"           → /login       (hidden on /dashboard and sub-routes)
 *
 * Both links use className="btn" to match the existing header button style.
 */
export default function HeaderNav() {
    const pathname = usePathname();
    const isDashboard = pathname.startsWith("/dashboard");

  return (
        <div className="tr">
              <Link href="/scoreboard" className="btn">
                      Public Scoreboard
              </Link>Link>
          {!isDashboard && (
                  <Link href="/login" className="btn">
                            Sign In
                  </Link>Link>
              )}
        </div>div>
      );
}</div>
