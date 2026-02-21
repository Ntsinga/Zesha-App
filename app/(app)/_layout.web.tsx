import React, { useState, useEffect } from "react";
import { useRouter, usePathname, Slot } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-react";
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
  LogIn,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import {
  selectUserRole,
  selectViewingAgencyId,
  selectViewingAgencyName,
  exitAgency,
} from "../../store/slices/authSlice";
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
  const { user: clerkUser } = useUser();
  const dispatch = useDispatch<AppDispatch>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dashboardCompanyName = useSelector(
    (state: RootState) => state.dashboard.companyInfo?.name ?? "Company",
  );

  // Superadmin state
  const userRole = useSelector(selectUserRole);
  const viewingAgencyId = useSelector(selectViewingAgencyId);
  const viewingAgencyName = useSelector(selectViewingAgencyName);
  const backendUser = useSelector((state: RootState) => state.auth.user);
  const isSyncing = useSelector((state: RootState) => state.auth.isSyncing);

  // Fallback to Clerk metadata role when backend user is unavailable
  // This handles the case where backend is down but Clerk has the role in publicMetadata
  const clerkMetadataRole =
    (clerkUser?.publicMetadata as { role?: string } | undefined)?.role ?? null;
  const effectiveRole = userRole ?? clerkMetadataRole;
  const isSuperAdmin = effectiveRole === "Super Administrator";
  const isViewingAgency = viewingAgencyId !== null;

  // Determine what to show in sidebar subtitle
  // Superadmin NOT viewing agency: "Admin Portal"
  // Superadmin viewing agency: the agency name
  // Regular user: their company name
  const sidebarSubtitle =
    isSuperAdmin && !isViewingAgency
      ? "Admin Portal"
      : isViewingAgency
        ? viewingAgencyName
        : dashboardCompanyName;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Redirect superadmin to agencies page if they try to access agency-specific pages without viewing an agency
  // Uses effectiveRole which falls back to Clerk metadata when backend is unavailable
  useEffect(() => {
    // Need at least Clerk user loaded to determine role from metadata
    if (!backendUser && !clerkUser) {
      return;
    }

    if (
      isSuperAdmin &&
      !isViewingAgency &&
      pathname !== "/agencies" &&
      pathname !== "/agency-form" &&
      pathname !== "/settings"
    ) {
      router.replace("/agencies");
    }
  }, [
    isSuperAdmin,
    isViewingAgency,
    pathname,
    router,
    backendUser,
    clerkUser,
    clerkMetadataRole,
    effectiveRole,
  ]);

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

  // Superadmin-only nav items (shown when NOT viewing an agency)
  const superAdminNavItems: NavItem[] = [
    {
      href: "/agencies",
      label: "Manage Agencies",
      icon: <Building2 size={20} />,
    },
  ];

  // Regular agency nav items (shown for regular users OR superadmin viewing an agency)
  const agencyNavItems: NavItem[] = [
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

  // Determine which nav items to show based on user role and viewing state
  // Superadmin NOT viewing agency = only see Manage Agencies
  // Superadmin viewing agency = see agency nav items
  // Regular user = see agency nav items
  const navItems: NavItem[] =
    isSuperAdmin && !isViewingAgency ? superAdminNavItems : agencyNavItems;

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

  // Handle exiting agency view
  const handleExitAgency = () => {
    dispatch(exitAgency());
    router.push("/agencies");
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
              <div className="mobile-menu-subtitle">{sidebarSubtitle}</div>
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
              <div className="sidebar-subtitle">{sidebarSubtitle}</div>
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
        {/* Agency Viewing Banner - only shown when superadmin is viewing an agency */}
        {isSuperAdmin && isViewingAgency && (
          <div className="agency-viewing-banner">
            <div className="banner-content">
              <div className="banner-icon">
                <Building2 size={18} color="white" />
              </div>
              <span className="banner-text">
                Viewing: <strong>{viewingAgencyName}</strong>
              </span>
            </div>
            <button className="btn-exit-agency" onClick={handleExitAgency}>
              <LogIn size={16} style={{ transform: "scaleX(-1)" }} />
              <span>Exit Agency</span>
            </button>
          </div>
        )}

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

        {/* Page Content - scrollable container */}
        <div className="page-scroll-container">
          <Slot />
        </div>
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
