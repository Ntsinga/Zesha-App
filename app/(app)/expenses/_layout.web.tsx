import React from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import "@/styles/web.css";

const TABS = [
  { label: "Expenses", href: "/expenses" },
  { label: "Recurring", href: "/expenses/recurring" },
] as const;

export default function ExpensesLayoutWeb() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="page-wrapper">
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Expenses</h1>
        </div>
      </header>

      {/* Sub-navigation */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid var(--color-border)",
          paddingLeft: 32,
          display: "flex",
          gap: 0,
        }}
      >
        {TABS.map(({ label, href }) => {
          const active =
            href === "/expenses"
              ? pathname === "/expenses" || pathname === "/expenses/"
              : pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href as any)}
              style={{
                padding: "13px 20px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--color-primary)" : "transparent"}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: active
                  ? "var(--color-primary)"
                  : "var(--color-text-secondary)",
                marginBottom: -1,
                transition: "color 0.15s, border-color 0.15s",
                letterSpacing: "0.01em",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Slot />
    </div>
  );
}
