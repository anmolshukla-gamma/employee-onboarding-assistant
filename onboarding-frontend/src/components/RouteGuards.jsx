import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoading } from "./Modal";

/** Single source of truth for "where should this user land right now". */
export function landingPathFor(user) {
  if (!user) return "/login";
  if (user.is_admin) return "/admin";
  return user.role_id ? "/checklist" : "/select-role";
}

/**
 * Requires a logged-in user. Also enforces the role-selection step for
 * employees only — admins are never sent through role selection, since
 * role assignment doesn't gate the admin experience.
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!user?.is_admin && !user?.role_id && location.pathname !== "/select-role") {
    return <Navigate to="/select-role" replace />;
  }
  if ((user?.is_admin || user?.role_id) && location.pathname === "/select-role") {
    return <Navigate to={landingPathFor(user)} replace />;
  }

  return <Outlet />;
}

/** Requires an authenticated admin user. */
export function AdminRoute() {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to={landingPathFor(user)} replace />;

  return <Outlet />;
}

/** Redirects an already-authenticated user away from login/register. */
export function GuestRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <PageLoading />;
  if (isAuthenticated) {
    return <Navigate to={landingPathFor(user)} replace />;
  }
  return <Outlet />;
}
