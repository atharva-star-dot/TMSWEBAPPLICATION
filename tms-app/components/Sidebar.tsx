"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  Search,
  Users,
  BellRing,
  FileBarChart2,
  UserCog,
  Building2,
  Settings,
  HelpCircle,
  SunMoon,
  LogOut,
  Truck,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bills/new", label: "New Bill", icon: FilePlus },
  { href: "/bills", label: "All Bills", icon: ClipboardList },
  { href: "/search", label: "Search", icon: Search },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/sarthiwala", label: "Sarthiwala AI", icon: Sparkles },
  { href: "/gst-report", label: "GST Report", icon: FileBarChart2 },
  { href: "/users", label: "User Mgmt", icon: UserCog, adminOnly: true },
  { href: "/company", label: "Company", icon: Building2, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  companyName,
  username,
  role,
  onNavigate,
}: {
  companyName: string;
  username: string;
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [dark, setDark] = useState(
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col h-full text-sm" style={{ color: "var(--sidebar-text)" }}>
      <div className="flex items-center gap-2 px-5 py-5 font-bold text-white text-base border-b border-white/10">
        <Truck size={20} />
        <span className="truncate">{companyName || "TMS"}</span>
      </div>

      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-white font-medium">{username}</p>
        <p className="text-xs opacity-70 capitalize">{role}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.filter((item) => !item.adminOnly || role === "admin").map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-5 py-2.5 transition-colors"
              style={{
                background: active ? "var(--sidebar-active)" : "transparent",
                color: active ? "white" : "var(--sidebar-text)",
              }}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/help"
          onClick={onNavigate}
          className="flex items-center gap-3 px-5 py-2.5"
          style={{ color: "var(--sidebar-text)" }}
        >
          <HelpCircle size={17} />
          Help
        </Link>
      </nav>

      <div className="border-t border-white/10 py-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-5 py-2.5 text-left"
          style={{ color: "var(--sidebar-text)" }}
        >
          <SunMoon size={17} />
          Toggle Theme
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-2.5 text-left text-red-400"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  companyName,
  username,
  role,
}: {
  companyName: string;
  username: string;
  role: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — hamburger + company name, visible below md */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 shadow-md"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-white p-1 -ml-1"
        >
          <Menu size={24} />
        </button>
        <Truck size={18} className="text-white" />
        <span className="text-white font-semibold truncate">{companyName || "TMS"}</span>
      </div>

      {/* Desktop static sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 flex-col"
        style={{ background: "var(--sidebar-bg)", boxShadow: "4px 0 24px -8px rgba(0,0,0,0.25)" }}
      >
        <SidebarContent companyName={companyName} username={username} role={role} />
      </aside>

      {/* Mobile drawer + backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className="relative w-72 max-w-[80vw] h-full flex flex-col shadow-2xl animate-[slidein_0.2s_ease-out]"
            style={{ background: "var(--sidebar-bg)" }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 text-white/70 p-1"
            >
              <X size={20} />
            </button>
            <SidebarContent
              companyName={companyName}
              username={username}
              role={role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
