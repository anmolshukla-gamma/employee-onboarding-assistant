import { useEffect, useMemo, useState } from "react";
import { fetchTeamMembers, addTeamMember, removeTeamMember, fetchAdminUsers } from "../../api/admin";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { Modal, ConfirmModal } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import { IconPlus, IconTrash } from "../../components/Icons";

export default function TeamMembersPanel({ teamId, teamName }) {
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adding, setAdding] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  function load() {
    setLoading(true);
    fetchTeamMembers(teamId)
      .then(({ data }) => setMembers(Array.isArray(data) ? data : []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load team members.")))
      .finally(() => setLoading(false));
  }

  useEffect(load, [teamId]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);

  async function openAdd() {
    setSelectedUserId("");
    setAddOpen(true);
    setCandidatesLoading(true);
    try {
      // Pull the full user list and filter out people already on this team
      // client-side — simplest way to reuse the existing users endpoint.
      // /admin/users returns a paginated object ({ items, page, total, ... }),
      // not a bare array, and defaults to only 20 users per page — request
      // the max page size so every user is a candidate here.
      const { data } = await fetchAdminUsers({ page_size: 100 });
      const users = Array.isArray(data?.items) ? data.items : [];
      setCandidateUsers(users.filter((u) => !memberIds.has(u.id)));
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not load users to add."));
    } finally {
      setCandidatesLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedUserId) return;
    setAdding(true);
    try {
      await addTeamMember(teamId, Number(selectedUserId));
      toast.success("Member added.");
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not add this member."));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeTeamMember(teamId, removeTarget.user_id);
      toast.success("Member removed.");
      setRemoveTarget(null);
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not remove this member."));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <p className="text-muted" style={{ fontSize: 13 }}>People currently assigned to {teamName || "this team"}.</p>
        <button className="btn btn-secondary btn-sm" onClick={openAdd}>
          <IconPlus width={14} height={14} /> Add member
        </button>
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {!loading && members.length === 0 ? (
          <EmptyState title="No members yet" description="Add people to this team, or assign a team to a user from the Users page." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="cell-name">
                      {m.full_name}
                      {m.is_admin && <span className="status-badge status-admin" style={{ marginLeft: 6 }}>Admin</span>}
                    </td>
                    <td className="cell-muted">{m.email}</td>
                    <td className="cell-muted">{m.role_name || "—"}</td>
                    <td>
                      <StatusBadge status={m.is_active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => setRemoveTarget(m)}>
                        <IconTrash width={14} height={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addOpen && (
        <Modal title="Add member" onClose={() => setAddOpen(false)}>
          {candidatesLoading ? (
            <p className="text-muted" style={{ fontSize: 13 }}>Loading users…</p>
          ) : candidateUsers.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>Everyone is already on this team, or no other users exist yet.</p>
          ) : (
            <form onSubmit={handleAdd}>
              <div className="field">
                <label htmlFor="tm_user">User</label>
                <select id="tm_user" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Select a user…</option>
                  {candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAddOpen(false)} disabled={adding}>
                  Cancel
                </button>
                <LoadingButton type="submit" loading={adding} disabled={!selectedUserId}>
                  Add member
                </LoadingButton>
              </div>
            </form>
          )}
        </Modal>
      )}

      {removeTarget && (
        <ConfirmModal
          title="Remove member"
          message={`Remove ${removeTarget.full_name} from ${teamName || "this team"}?`}
          confirmLabel="Remove"
          loading={removing}
          onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
