import React, { useState, useEffect } from "react";
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
  Menu,
  X,
  Home,
  User,
} from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import TopBarWeb from "../../components/TopBar.web";
import "../../styles/web.css";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  mobileIcon?: React.ReactNode;
}

/**
 * Web-specific layout with persistent sidebar and mobile navigation
 */
export default function AppLayoutWeb() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const companyName = useSelector(
    (state: RootState) => state.dashboard.companyInfo?.name ?? "Company",
  );

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      mobileIcon: <Home size={24} />,
    },
    {
      href: "/balance",
      label: "Daily Reconciliation",
      icon: <Wallet size={20} />,
      mobileIcon: <Wallet size={24} />,
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
    {
      href: "/expenses",
      label: "Expenses",
      icon: <Receipt size={20} />,
      mobileIcon: <Receipt size={24} />,
    },
    {
      href: "/accounts",
      label: "Accounts",
      icon: <Receipt size={20} />,
    },
  ];

  // Bottom nav items (subset for mobile)
  const mobileNavItems = [
    { href: "/", label: "Home", icon: <Home size={24} /> },
    { href: "/balance", label: "Reconcile", icon: <Wallet size={24} /> },
    { href: "/expenses", label: "Expenses", icon: <Receipt size={24} /> },
    { href: "/settings", label: "Profile", icon: <User size={24} /> },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href as any);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="web-layout">
      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Slide-out Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? "active" : ""}`}>
        <div className="mobile-menu-header">
          <div className="mobile-menu-brand">
            <div className="mobile-menu-logo">
              <Building2 size={24} color="white" />
            </div>
            <div>
              <div className="mobile-menu-title">Zesha</div>
              <div className="mobile-menu-subtitle">{companyName}</div>
            </div>
          </div>
          <button
            className="mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={24} color="white" />
          </button>
        </div>
        <nav className="mobile-menu-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`mobile-menu-link ${isActive(item.href) ? "active" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-menu-footer">
          <button
            onClick={() => handleNavigation("/settings")}
            className="mobile-menu-link"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button onClick={handleSignOut} className="mobile-menu-link">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
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

      {/* Main Content Area */}
      <main className="content-area">
        {/* Mobile Header - only visible on mobile */}
        <header className="mobile-header">
          <div className="mobile-header-brand">
            <div className="mobile-header-logo">
              <Building2 size={20} color="white" />
            </div>
            <span className="mobile-header-title">Zesha</span>
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Desktop TopBar - hidden on mobile */}
        <TopBarWeb />

        {/* Page Content */}
        <Slot />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <ul>
          {mobileNavItems.map((item) => (
            <li key={item.href} className="mobile-nav-item">
              <button
                onClick={() => router.push(item.href as any)}
                className={`mobile-nav-link ${isActive(item.href) ? "active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
