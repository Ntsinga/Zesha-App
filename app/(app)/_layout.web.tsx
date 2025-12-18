import React from "react";
import { useRouter, usePathname, Slot } from "expo-router";
import { useAuth } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  History,
  Receipt,
  Wallet,
  DollarSign,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import "../../styles/web.css";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Web-specific layout with persistent sidebar
 */
export default function AppLayoutWeb() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const companyName = useSelector(
    (state: RootState) => state.dashboard.companyInfo?.name ?? "Company"
  );

  const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    {
      href: "/balance",
      label: "Daily Reconciliation",
      icon: <Wallet size={20} />,
    },

    {
      href: "/history",
      label: "Reconciliation History",
      icon: <History size={20} />,
    },
    {
      href: "/commissions",
      label: "Commissions",
      icon: <DollarSign size={20} />,
    },
    { href: "/expenses", label: "Expenses", icon: <Receipt size={20} /> },
    {
      href: "/accounts",
      label: "Accounts",
      icon: <Receipt size={20} />,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(href);
  };
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <div className="web-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Building2 size={24} color="white" />
            </div>
            <div>
              <div className="sidebar-title">Zesha</div>
              <div className="sidebar-subtitle">{companyName}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.href} className="nav-item">
                <button
                  onClick={() => router.push(item.href as any)}
                  className={`nav-link ${isActive(item.href) ? "active" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => router.push("/settings")} className="nav-link">
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button onClick={handleSignOut} className="nav-link">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content - takes remaining space */}
      <main className="content-area">
        <Slot />
      </main>
    </div>
  );
}
