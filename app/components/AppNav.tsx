"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoChatbubbleEllipses, IoSettingsSharp } from "react-icons/io5";

const links = [
  { href: "/", label: "Chat", icon: IoChatbubbleEllipses },
  { href: "/settings", label: "Settings", icon: IoSettingsSharp },
];

type AppNavProps = {
  compact?: boolean;
};

export default function AppNav({ compact = false }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`flex items-center gap-1 rounded-2xl border border-white/10 bg-[rgba(13,33,51,0.88)] p-1 backdrop-blur-xl ${
        compact ? "shadow-none" : "shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      }`}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-xl transition ${
              compact ? "px-2.5 py-2 text-xs" : "px-3.5 py-2.5 text-sm"
            } ${
              active
                ? "bg-gradient-to-r from-[var(--teal)] to-[var(--teal-bright)] text-[var(--ink)]"
                : "text-white/65 hover:bg-white/8 hover:text-white"
            }`}
            title={label}
          >
            <Icon size={compact ? 14 : 16} />
            <span className={compact ? "hidden sm:inline" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
