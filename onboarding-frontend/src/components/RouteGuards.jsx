import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoading } from "./Modal";

/** Requires a logged-in user. Also enforces the role-selection step. */
export function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!user?.role_id && location.pathname !== "/select-role") {
    return <Navigate to="/select-role" replace />;
  }
  if (user?.role_id && location.pathname === "/select-role") {
    return <Navigate to="/checklist" replace />;
  }

  return <Outlet />;
}

/** Requires an authenticated admin user. */
export function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/checklist" replace />;

  return <Outlet />;
}

/** Redirects an already-authenticated user away from login/register. */
export function GuestRoute() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <PageLoading />;
  if (isAuthenticated) {
    return <Navigate to={user?.role_id ? "/checklist" : "/select-role"} replace />;
  }
  return <Outlet />;
}
