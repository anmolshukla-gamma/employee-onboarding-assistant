# Employee Onboarding & Knowledge Buddy — Frontend

A React (Vite) frontend for the internal Employee Onboarding & Knowledge Buddy product: role-based onboarding checklists, an AI onboarding assistant (RAG-backed chat), and an admin panel for managing users, roles, checklists, and documents.

## Tech stack

- React 19 + Vite
- React Router v7 (client-side routing, protected routes)
- Axios (API layer, JWT attached via interceptor)
- Plain CSS with a small design-token system (no UI framework) — clean blue/gray internal-tool look
- Token-based auth (JWT stored in `localStorage`)

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the API base URL**

   Copy the example env file and adjust if your backend runs elsewhere:

   ```bash
   cp .env.example .env
   ```

   `.env`:
   ```
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`. Make sure the backend is running at the URL configured above — CORS is expected to already be open on the backend.

4. **Build for production**

   ```bash
   npm run build
   npm run preview   # optional local preview of the production build
   ```

## Project structure

```
src/
  api/              Axios instance + one module per API resource
    axios.js        Shared instance, JWT interceptor, 401 handling, error helper
    auth.js         /auth/register, /auth/login (form-encoded), /auth/me
    roles.js        /roles/, /roles/select
    checklist.js    /checklist/my, /checklist/complete
    ai.js           /ai/ask, /ai/history, /ai/process/{id}
    documents.js    /documents/ (list/upload/delete)
    admin.js        /admin/* (stats, users, roles, checklists, items)

  context/
    AuthContext.jsx   Current user, token, login/logout, /auth/me refresh
    ToastContext.jsx  Global toast notifications (success/error/info)

  components/
    Layout.jsx         Sidebar + topbar shell used by all authenticated pages
    RouteGuards.jsx     ProtectedRoute / AdminRoute / GuestRoute
    ProgressBar.jsx, ChatBubble.jsx, StatusBadge.jsx, EmptyState.jsx,
    LoadingButton.jsx, Modal.jsx (Modal, ConfirmModal, PageLoading), Icons.jsx

  pages/
    Login.jsx, Register.jsx, RoleSelect.jsx, Checklist.jsx, Chat.jsx, NotFound.jsx
    admin/
      Dashboard.jsx, Users.jsx, Roles.jsx, RoleChecklists.jsx,
      ChecklistItems.jsx, Documents.jsx

  styles/global.css   Design tokens + all component styles
```

## Routing

| Path | Access | Notes |
|---|---|---|
| `/login`, `/register` | Public (redirects away if already logged in) | |
| `/select-role` | Authenticated, no role yet | Auto-redirects here if `role_id` is null; auto-redirects away once a role is set |
| `/checklist` | Authenticated | Default landing page after role selection |
| `/chat` | Authenticated | AI assistant |
| `/admin` | Admin only | Dashboard stats |
| `/admin/users` | Admin only | Toggle admin / active status |
| `/admin/roles` | Admin only | Role CRUD |
| `/admin/roles/:roleId/checklists` | Admin only | Checklist CRUD for a role |
| `/admin/checklists/:checklistId/items` | Admin only | Checklist item CRUD |
| `/admin/documents` | Admin only | Upload / process / delete documents |

Route protection lives in `components/RouteGuards.jsx`. Admin-only routes are nested under `<AdminRoute />`, so a non-admin who lands on `/admin/*` is redirected to `/checklist`.

## Auth notes

- Login sends `application/x-www-form-urlencoded` with `username`/`password` fields (per the backend contract), not JSON.
- The JWT is stored in `localStorage` under `access_token` and attached to every request as `Authorization: Bearer <token>` via an Axios request interceptor.
- A response interceptor listens for `401`s and dispatches a global event that logs the user out and returns them to `/login` — no manual token-expiry timer is needed, since the token is simply revalidated on the next request.
- `is_admin` from `/auth/me` gates all admin UI and routes.

## AI chat behavior

- The frontend keeps its own visible message list in component state (the backend's short server-side memory is separate and not reflected in the UI beyond what `/ai/ask` returns).
- "Clear chat" calls `DELETE /ai/history` and also resets the local message list.
- Each assistant reply shows its `sources` (if any) as small chips under the bubble.

## Known backend contracts respected

- Login is form-data, not JSON.
- Document upload/process/delete and all `/admin/*` endpoints are admin-only in the UI (buttons/routes are hidden, but the backend is still the source of truth for authorization).
- Role deletion surfaces a specific toast message when the backend rejects it because a role still has linked users/checklists.
