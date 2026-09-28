"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/types";

export default function NavBar({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/";
  const specials = [
    { name: "Futebol", href: "/futebol" },
    { name: "Fofoca", href: "/fofoca" },
  ];
  const specialNames = new Set(["futebol","fofoca"]);

  return (
    <div className="navWrap">
      <nav className="container nav">
        <Link
          href="/"
          className={`navLink ${isHomeActive ? "navActive" : ""}`}
        >
          Início
        </Link>
        {categories.filter((c)=>!specialNames.has(c.slug.toLowerCase())&&!specialNames.has(c.name.toLowerCase())).map((c) => {
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
        {specials.map((item)=>{
          const isActive=pathname===item.href||pathname.startsWith(item.href+"/");
          return <Link key={item.href} href={item.href} className={`navLink navSpecial ${isActive?"navActive":""}`}>{item.name}</Link>;
        })}
      </nav>
    </div>
  );
}
