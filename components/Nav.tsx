"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ isParent }: { isParent: boolean }) {
  const path = usePathname();
  const links = [
    ["/", "Oversigt"],
    ["/opgaver", "Opgaver"],
    ["/lommepenge", "Lommepenge"],
    ["/madplan", "Madplan"],
    ["/indkob", "Indkøb"],
    ["/opskrifter", "Opskrifter"],
    ["/kalender", "Kalender"],
    ...(isParent ? [["/familie", "Familie"]] : [["/profil", "Profil"]]),
  ];
  return (
    <nav className="nav">
      {links.map(([href, label]) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "active" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
