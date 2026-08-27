import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchAdminTeams,
  fetchAdminUsers,
  fetchTeamMembers,
  addTeamMember,
} from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { PageLoading } from "../../components/Modal";
import LoadingButton from "../../components/LoadingButton";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";

export default function AddTeamMember() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState(null);
  const [users, setUsers] = useState([]);
  const [memberIds, setMemberIds] = useState(new Set());
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAdminTeams(),
      fetchAdminUsers({ page: 1, page_size: 100 }),
      fetchTeamMembers(teamId),
    ])
      .then(([teamsRes, usersRes, membersRes]) => {
        const teams = Array.isArray(teamsRes.data) ? teamsRes.data : teamsRes.data?.items || [];
        setTeam(teams.find((t) => String(t.id) === String(teamId)) || null);

        const list = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.items || [];
        setUsers(list);

        const members = Array.isArray(membersRes.data)
          ? membersRes.data
          : membersRes.data?.items || [];
        setMemberIds(
          new Set(members.map((m) => m.user_id || m.id).filter(Boolean))
        );
      })
      .catch((err) => toast.error(extractErrorMessage(err, "Could not load users.")))
      .finally(() => setLoading(false));
  }, [teamId, toast]);

  const candidates = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users
      .filter((u) => !memberIds.has(u.id))
      .filter((u) => {
        if (!query) return true;
        return (
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.role_name?.toLowerCase().includes(query)
        );
      })
      .slice(0, 30);
  }, [users, memberIds, q]);

  async function handleAdd() {
    if (!picked) {
      toast.error("Select a user first.");
      return;
    }
    setSaving(true);
    try {
      await addTeamMember(teamId, picked.id);
      toast.success(`${picked.full_name} added to team.`);
      navigate(`/admin/teams/${teamId}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not add member."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="tm-page">
      <div className="tm-top">
        <div>
          <div className="tm-breadcrumb">
            <Link to="/admin/teams">Teams</Link>
            <span>/</span>
            <Link to={`/admin/teams/${teamId}`}>{team?.name || `Team #${teamId}`}</Link>
            <span>/</span>
            <span>Add member</span>
          </div>
          <h1>Add member</h1>
          <p>Search people and assign them to this team.</p>
        </div>
        <Link to={`/admin/teams/${teamId}`} className="btn btn-secondary">
          Back to team
        </Link>
      </div>

      <div className="tm-layout">
        <section className="tm-main card">
          <div className="tm-search-wrap">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="tm-search"
            />
          </div>

          {candidates.length === 0 ? (
            <EmptyState
              title="No matching people"
              description={
                q
                  ? "Try another name or email."
                  : "Everyone is already on this team, or no users exist yet."
              }
            />
          ) : (
            <div className="tm-list">
              {candidates.map((u) => {
                const active = picked?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`tm-person ${active ? "selected" : ""}`}
                    onClick={() => setPicked(u)}
                  >
                    <div className="tm-avatar">
                      {(u.full_name || "?").trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="tm-person-body">
                      <div className="tm-person-name">
                        {u.full_name}
                        {u.is_admin && (
                          <span className="status-badge status-admin" style={{ marginLeft: 6 }}>
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="tm-person-meta">
                        {u.email}
                        {u.role_name ? ` · ${u.role_name}` : ""}
                        {u.team_name ? ` · currently ${u.team_name}` : " · no team"}
                      </div>
                    </div>
                    <StatusBadge status={u.is_active ? "active" : "inactive"} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="tm-side">
          <div className="tm-side-card">
            <h3>Selection</h3>
            {!picked ? (
              <p className="tm-empty">Select one person from the list.</p>
            ) : (
              <div className="tm-preview">
                <div className="tm-avatar lg">
                  {(picked.full_name || "?").trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{picked.full_name}</strong>
                  <div className="text-muted" style={{ fontSize: 12.5 }}>
                    {picked.email}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                    {picked.role_name || "No role"}
                    {picked.team_name ? ` · moves from ${picked.team_name}` : ""}
                  </div>
                </div>
              </div>
            )}

            <div className="tm-side-actions">
              <LoadingButton
                type="button"
                className="btn btn-primary btn-block"
                loading={saving}
                disabled={!picked}
                onClick={handleAdd}
              >
                Add to team
              </LoadingButton>
              <Link to={`/admin/teams/${teamId}`} className="btn btn-secondary btn-block">
                Cancel
              </Link>
            </div>
          </div>

          <div className="tm-tip">
            <strong>Note</strong>
            <p>
              Adding a user here assigns them to this team. If they already had another team,
              they will be moved.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}