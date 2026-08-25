import { useEffect, useRef, useState } from "react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  IconKey,
  IconLayers,
  IconWrench,
  IconMessageSquare,
  IconUser,
  IconChevronDown,
} from "./Icons";

const PAGE_TITLES = {
  "/checklist": "My checklist",
  "/access": "My Access",
  "/chat": "AI Assistant",
  "/profile": "My Profile",
  "/admin": "Admin dashboard",
  "/admin/users": "Manage users",
  "/admin/roles": "Manage roles",
  "/admin/documents": "Manage documents",
  "/admin/teams": "Manage teams",
  "/admin/tools": "Manage tools",
  "/admin/progress": "User progress",
  "/admin/comments": "Checklist feedback",
};

function titleFor(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/checklists")) return "Role checklists";
  if (pathname.includes("/items")) return "Checklist items";
  if (pathname.includes("/admin/teams/")) return "Team detail";
  if (pathname.includes("/admin/progress/")) return "User progress detail";
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
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const closeMobile = () => setMobileOpen(false);

  // Close the user menu on outside click or Escape.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen]);

  // Close the menu whenever the route changes (e.g. after clicking "View Profile").
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate("/login");
  };

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
          {isAdmin ? (
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
              <NavLink to="/admin/teams" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconLayers /> Teams
              </NavLink>
              <NavLink to="/admin/tools" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconWrench /> Tools
              </NavLink>
              <NavLink to="/admin/documents" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconDocuments /> Documents
              </NavLink>
              <NavLink to="/admin/comments" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconMessageSquare /> Feedback
              </NavLink>
            </>
          ) : (
            <>
              <div className="sidebar-section-label">Workspace</div>
              <NavLink to="/checklist" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconChecklist /> Checklist
              </NavLink>
              <NavLink to="/access" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconKey /> My Access
              </NavLink>
              <NavLink to="/chat" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`} onClick={closeMobile}>
                <IconChat /> AI Assistant
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="flex-between" style={{ gap: 14 }}>
            <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <IconMenu />
            </button>
            <span className="topbar-title">{titleFor(location.pathname)}</span>
          </div>
          <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="topbar-user user-menu-trigger"
              id="user-menu-btn"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
            >
              <div className="topbar-user-meta">
                <div className="topbar-user-name">{user?.full_name}</div>
                <div className="topbar-user-role">{isAdmin ? "Administrator" : "Employee"}</div>
              </div>
              <div className="avatar">{initials(user?.full_name)}</div>
              <IconChevronDown width={14} height={14} className="user-menu-chevron" />
            </button>

            {userMenuOpen && (
              <div className="user-menu-dropdown" role="menu">
                <Link to="/profile" className="user-menu-item" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                  <IconUser width={15} height={15} /> View Profile
                </Link>
                <button type="button" className="user-menu-item user-menu-item-danger" id="logout-btn" role="menuitem" onClick={handleLogout}>
                  <IconLogout width={15} height={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
