"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/types";

export default function NavBar({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/";

  return (
    <div className="navWrap">
      <nav className="container nav">
        <Link
          href="/"
          className={`navLink ${isHomeActive ? "navActive" : ""}`}
        >
          Início
        </Link>
        {categories.map((c) => {
          const href = `/categoria/${c.slug}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={c.id}
              href={href}
              className={`navLink ${isActive ? "navActive" : ""}`}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
