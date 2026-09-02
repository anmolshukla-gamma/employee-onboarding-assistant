import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ChatProvider } from "./context/ChatContext";
import { ProtectedRoute, AdminRoute, GuestRoute, landingPathFor } from "./components/RouteGuards";
import { PageLoading } from "./components/Modal";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";


import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleSelect from "./pages/RoleSelect";
import Checklist from "./pages/Checklist";
import Chat from "./pages/Chat";
import MyAccess from "./pages/MyAccess";
import Profile from "./pages/Profile";
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
import AdminToolRequests from "./pages/admin/ToolRequests";
import AdminProgress from "./pages/admin/Progress";
import AdminProgressDetail from "./pages/admin/ProgressDetail";
import AdminComments from "./pages/admin/Comments";

import CreateUser from "./pages/admin/CreateUser";
import CreateRole from "./pages/admin/CreateRole";
import CreateChecklistItem from "./pages/admin/CreateChecklistItem";
import EditChecklistItem from "./pages/admin/EditChecklistItem";
import CreateChecklist from "./pages/admin/CreateChecklist";
import CreateTeam from "./pages/admin/CreateTeam";
import EditTeam from "./pages/admin/EditTeam";
import AddTeamTools from "./pages/admin/AddTeamTools";
import AddTeamMember from "./pages/admin/AddTeamMember";
import CreateTool from "./pages/admin/CreateTool";
import EditTool from "./pages/admin/EditTool";
import UploadDocument from "./pages/admin/UploadDocument";
import ReviewComment from "./pages/admin/ReviewComment";








/** "/" shows the public landing page to signed-out visitors, and sends
 *  signed-in users straight to their dashboard (admin / checklist / select-role). */
function RootRoute() {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <PageLoading />;
  if (isAuthenticated) return <Navigate to={landingPathFor(user)} replace />;
  return <Landing />;
}

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
                  <Route path="/profile" element={<Profile />} />
  
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
                    <Route path="/admin/tool-requests" element={<AdminToolRequests />} />
                    <Route path="/admin/progress" element={<AdminProgress />} />
                    <Route path="/admin/progress/:userId" element={<AdminProgressDetail />} />
                    <Route path="/admin/comments" element={<AdminComments />} />
                    <Route path="/admin/users/new" element={<CreateUser />} />
                    <Route path="/admin/roles/new" element={<CreateRole />} />
                    <Route
                      path="/admin/checklists/:checklistId/items/new"
                      element={<CreateChecklistItem />}
                    />
                    <Route
                      path="/admin/checklists/:checklistId/items/:itemId/edit"
                      element={<EditChecklistItem />}
                    />
                    <Route
                      path="/admin/roles/:roleId/checklists/new"
                      element={<CreateChecklist />}
                    />
                    <Route path="/admin/teams/new" element={<CreateTeam />} />
                    <Route path="/admin/teams/:teamId/edit" element={<EditTeam />} />
                    <Route path="/admin/teams/:teamId/tools/add" element={<AddTeamTools />} />
                    <Route path="/admin/teams/:teamId/members/add" element={<AddTeamMember />} />
                    <Route path="/admin/tools/new" element={<CreateTool />} />
                    <Route path="/admin/tools/:toolId/edit" element={<EditTool />} />
                    <Route path="/admin/documents/upload" element={<UploadDocument />} />
                    <Route path="/admin/comments/:commentId/review" element={<ReviewComment />} />
                  </Route>
                </Route>
              </Route>
  
              <Route path="/" element={<RootRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
          </ChatProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
