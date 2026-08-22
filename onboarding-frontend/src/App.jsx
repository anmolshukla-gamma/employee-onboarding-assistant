import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ChatProvider } from "./context/ChatContext";
import { ProtectedRoute, AdminRoute, GuestRoute } from "./components/RouteGuards";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleSelect from "./pages/RoleSelect";
import Checklist from "./pages/Checklist";
import Chat from "./pages/Chat";
import MyAccess from "./pages/MyAccess";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminRoles from "./pages/admin/Roles";
import AdminRoleChecklists from "./pages/admin/RoleChecklists";
import AdminChecklistItems from "./pages/admin/ChecklistItems";
import AdminDocuments from "./pages/admin/Documents";
import AdminTeams from "./pages/admin/Teams";
import AdminTeamDetail from "./pages/admin/TeamDetail";
import AdminTools from "./pages/admin/Tools";
import AdminProgress from "./pages/admin/Progress";
import AdminProgressDetail from "./pages/admin/ProgressDetail";
import AdminComments from "./pages/admin/Comments";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ChatProvider>
            <Routes>
              {/* Public */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>
  
              {/* Role selection sits outside the sidebar layout */}
              <Route element={<ProtectedRoute />}>
                <Route path="/select-role" element={<RoleSelect />} />
              </Route>
  
              {/* Authenticated app shell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/checklist" element={<Checklist />} />
                  <Route path="/access" element={<MyAccess />} />
                  <Route path="/chat" element={<Chat />} />
  
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/roles" element={<AdminRoles />} />
                    <Route path="/admin/roles/:roleId/checklists" element={<AdminRoleChecklists />} />
                    <Route path="/admin/checklists/:checklistId/items" element={<AdminChecklistItems />} />
                    <Route path="/admin/documents" element={<AdminDocuments />} />
                    <Route path="/admin/teams" element={<AdminTeams />} />
                    <Route path="/admin/teams/:teamId" element={<AdminTeamDetail />} />
                    <Route path="/admin/tools" element={<AdminTools />} />
                    <Route path="/admin/progress" element={<AdminProgress />} />
                    <Route path="/admin/progress/:userId" element={<AdminProgressDetail />} />
                    <Route path="/admin/comments" element={<AdminComments />} />
                  </Route>
                </Route>
              </Route>
  
              <Route path="/" element={<Navigate to="/checklist" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ChatProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
