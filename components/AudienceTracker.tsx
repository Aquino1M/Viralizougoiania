"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function AudienceTracker() {
  const pathname = usePathname();
  const lastTracked = useRef("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || "" }),
      keepalive: true,
      cache: "no-store",
    }).catch(() => {});
  }, [pathname]);

  return null;
}
