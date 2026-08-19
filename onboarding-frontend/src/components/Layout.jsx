import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconChecklist,
  IconChat,
  IconDashboard,
  IconUsers,
  IconRoles,
  IconDocuments,
  IconLogout,
  IconMenu,
} from "./Icons";

const PAGE_TITLES = {
  "/checklist": "My checklist",
  "/chat": "AI Assistant",
  "/admin": "Admin dashboard",
  "/admin/users": "Manage users",
  "/admin/roles": "Manage roles",
  "/admin/documents": "Manage documents",
};

function titleFor(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/checklists")) return "Role checklists";
  if (pathname.includes("/items")) return "Checklist items";
  return "Onboarding Buddy";
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase();
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="app-shell">
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">OB</div>
          <div className="sidebar-brand-text">
            Onboarding Buddy
            <span>Internal tool</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Workspace</div>
          <NavLink to="/checklist" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
            <IconChecklist /> Checklist
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
            <IconChat /> AI Assistant
          </NavLink>

          {isAdmin && (
            <>
              <div className="sidebar-section-label">Admin</div>
              <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconDashboard /> Dashboard
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconUsers /> Users
              </NavLink>
              <NavLink to="/admin/roles" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconRoles /> Roles
              </NavLink>
              <NavLink to="/admin/documents" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconDocuments /> Documents
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <button className="sidebar-link" id="logout-btn" style={{ width: "100%" }} onClick={logout}>
            <IconLogout /> Logout
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="flex-between" style={{ gap: 14 }}>
            <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <IconMenu />
            </button>
            <span className="topbar-title">{titleFor(location.pathname)}</span>
          </div>
          <div className="topbar-user">
            <div className="topbar-user-meta">
              <div className="topbar-user-name">{user?.full_name}</div>
              <div className="topbar-user-role">{isAdmin ? "Administrator" : "Employee"}</div>
            </div>
            <div className="avatar">{initials(user?.full_name)}</div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
