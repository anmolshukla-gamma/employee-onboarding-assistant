import { useEffect, useState } from "react";
import { extractErrorMessage } from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { Modal, PageLoading } from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import LoadingButton from "../../components/LoadingButton";
import {
  fetchToolRequests,
  approveToolRequest,
  rejectToolRequest,
  revokeToolRequest,
  fetchAwsGroups,
  fetchAwsPolicies,
  fetchGithubTeams,
  fetchJiraGroups,
  fetchJiraProjects,
} from "../../api/admin";

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "revoked", label: "Revoked" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

function findMatchingGroup(groups, teamName) {
  if (!groups || groups.length === 0) return "Developers";
  if (!teamName) {
    const devFallback = groups.find((g) => g.name.toLowerCase() === "developers");
    return devFallback ? devFallback.name : groups[0].name;
  }

  const cleanTeam = teamName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Exact normalized match (e.g. "Data Engineering Platform" === "DataEngineering-Platform")
  const exact = groups.find((g) => g.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanTeam);
  if (exact) return exact.name;

  // 2. Substring matching
  const subMatch = groups.find((g) => {
    const cleanG = g.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleanTeam.includes(cleanG) || cleanG.includes(cleanTeam);
  });
  if (subMatch) return subMatch.name;

  // 3. Keyword matching (Analytics, Platform, DevOps)
  if (cleanTeam.includes("analytics")) {
    const gAnalytics = groups.find((g) => g.name.toLowerCase().includes("analytic"));
    if (gAnalytics) return gAnalytics.name;
  }
  if (cleanTeam.includes("platform")) {
    const gPlatform = groups.find((g) => g.name.toLowerCase().includes("platform"));
    if (gPlatform) return gPlatform.name;
  }
  if (cleanTeam.includes("devops")) {
    const gDevops = groups.find((g) => g.name.toLowerCase().includes("devop"));
    if (gDevops) return gDevops.name;
  }

  // 4. Engineering / Developer synonyms
  if (
    cleanTeam.includes("django") ||
    cleanTeam.includes("frontend") ||
    cleanTeam.includes("backend") ||
    cleanTeam.includes("develop") ||
    cleanTeam.includes("engineer")
  ) {
    const devGroup = groups.find(
      (g) => g.name.toLowerCase().includes("developer") || g.name.toLowerCase().includes("engineer")
    );
    if (devGroup) return devGroup.name;
  }

  // 5. Fallback to Developers or first group
  const fallback = groups.find((g) => g.name.toLowerCase() === "developers") || groups[0];
  return fallback ? fallback.name : "Developers";
}

function AwsApprovalModal({ request, onClose, onConfirm, loading }) {
  const [groups, setGroups] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isAutoMatched, setIsAutoMatched] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchAwsGroups(), fetchAwsPolicies()])
      .then(([gRes, pRes]) => {
        if (!active) return;
        const gList = Array.isArray(gRes.data) ? gRes.data : [];
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        setGroups(gList);
        setPolicies(pList);
        const matched = findMatchingGroup(gList, request.employee_team);
        setSelectedGroup(matched);
        setIsAutoMatched(true);
      })
      .catch((err) => console.warn("Failed to load AWS metadata", err))
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [request.employee_team]);

  const currentGroupObj = groups.find((g) => g.name === selectedGroup);
  const inheritedPolicies = currentGroupObj?.attached_policies || [];
  const inheritedArns = new Set(inheritedPolicies.map((p) => p.arn));

  const togglePolicy = (arn) => {
    if (inheritedArns.has(arn)) return; // Already in group
    setSelectedPolicies((prev) =>
      prev.includes(arn) ? prev.filter((p) => p !== arn) : [...prev, arn]
    );
  };

  const filteredPolicies = policies.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  });

  return (
    <Modal
      title={`Configure AWS Access — ${request.employee_name}`}
      onClose={onClose}
      width={620}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <LoadingButton
            className="btn btn-primary"
            loading={loading}
            onClick={() =>
              onConfirm({
                aws_group: selectedGroup,
                policy_arns: selectedPolicies,
              })
            }
          >
            Confirm & Provision to AWS
          </LoadingButton>
        </>
      }
    >
      {/* 1. Employee Context Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 16px",
          padding: "12px 16px",
          background: "rgba(37, 99, 235, 0.04)",
          borderRadius: 8,
          marginBottom: 18,
          border: "1px solid rgba(37, 99, 235, 0.12)",
          fontSize: 12.8,
        }}
      >
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>EMPLOYEE</span>
          <strong style={{ color: "#0f172a", fontSize: 13.5 }}>{request.employee_name}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ACCOUNT EMAIL</span>
          <span style={{ color: "#0f172a", fontFamily: "var(--font-mono, monospace)", fontSize: 12.5 }}>
            {request.employee_email}
          </span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ASSIGNED TEAM</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{request.employee_team || "Engineering Team"}</span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ROLE</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{request.employee_role || "Software Engineer"}</span>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
          <span className="spinner spinner-dark" style={{ width: 22, height: 22, display: "inline-block", marginBottom: 10 }} />
          <div style={{ fontSize: 13 }}>Loading live AWS IAM Groups & Policies...</div>
        </div>
      ) : (
        <>
          {/* 2. Primary IAM Group Selection */}
          <div className="field" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                Primary AWS IAM Group
              </label>
              {request.employee_team && isAutoMatched && (
                <span
                  style={{
                    fontSize: 11,
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  Auto-selected for {request.employee_team}
                </span>
              )}
            </div>
            <select
              className="input"
              style={{ width: "100%", height: 38, fontSize: 13.5 }}
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setIsAutoMatched(false);
              }}
            >
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} (IAM Group)
                </option>
              ))}
              {groups.length === 0 && (
                <option value="Developers">Developers (Default)</option>
              )}
            </select>

            {/* Display policies attached to the selected group */}
            <div
              style={{
                marginTop: 8,
                padding: "10px 14px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                POLICIES INHERITED FROM GROUP "{selectedGroup}":
              </div>
              {inheritedPolicies.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  No policies currently attached to this group in AWS.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {inheritedPolicies.map((p) => (
                    <span
                      key={p.arn}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 9px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                      title={p.arn}
                    >
                      <span style={{ color: "#10b981", fontSize: 13 }}>✓</span> {p.name}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
                💡 The user automatically inherits these permissions through their group membership in AWS.
              </div>
            </div>
          </div>

          {/* 3. Additional Managed Policies List with Search */}
          <div className="field" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                Additional AWS Policies (Optional)
              </label>
              <input
                className="input"
                style={{ width: 190, height: 28, fontSize: 11.5, padding: "2px 8px" }}
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: 6,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {filteredPolicies.map((p) => {
                const isInherited = inheritedArns.has(p.arn);
                const isChecked = selectedPolicies.includes(p.arn) || isInherited;

                return (
                  <label
                    key={p.arn}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: isInherited
                        ? "#f8fafc"
                        : isChecked
                        ? "rgba(37, 99, 235, 0.05)"
                        : "#ffffff",
                      border: isInherited
                        ? "1px solid #e2e8f0"
                        : isChecked
                        ? "1px solid #3b82f6"
                        : "1px solid #f1f5f9",
                      cursor: isInherited ? "default" : "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isInherited}
                      onChange={() => togglePolicy(p.arn)}
                      style={{
                        width: 16,
                        height: 16,
                        marginTop: 2,
                        cursor: isInherited ? "default" : "pointer",
                        flexShrink: 0,
                        accentColor: "#2563eb",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 12.8,
                            color: isInherited ? "#64748b" : isChecked ? "#1d4ed8" : "#0f172a",
                          }}
                        >
                          {p.name}
                        </span>
                        {isInherited ? (
                          <span
                            style={{
                              fontSize: 10.5,
                              background: "#e2e8f0",
                              color: "#475569",
                              padding: "1px 6px",
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            Already in group
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, color: "#94a3b8" }}>Managed Policy</span>
                        )}
                      </div>
                      {p.description && (
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.35 }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
              {filteredPolicies.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px 0", color: "#94a3b8", fontSize: 12 }}>
                  No policies found matching "{searchQuery}"
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>
              Check any extra policies above to attach them directly to this employee's IAM user in AWS.
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function GitHubApprovalModal({ request, onClose, onConfirm, loading }) {
  const [teams, setTeams] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [isAutoMatched, setIsAutoMatched] = useState(false);

  useEffect(() => {
    let active = true;
    fetchGithubTeams()
      .then(({ data }) => {
        if (!active) return;
        const tList = Array.isArray(data) ? data : [];
        setTeams(tList);
        const matched = findMatchingGroup(tList, request.employee_team);
        setSelectedTeam(matched || (tList[0] ? tList[0].slug : "developers"));
        setIsAutoMatched(true);
      })
      .catch((err) => console.warn("Failed to load GitHub teams", err))
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [request.employee_team]);

  return (
    <Modal
      title={`Configure GitHub Access — ${request.employee_name}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <LoadingButton
            className="btn btn-primary"
            loading={loading}
            onClick={() =>
              onConfirm({
                github_team_slug: selectedTeam,
                github_role: selectedRole,
              })
            }
          >
            Confirm & Add to GitHub
          </LoadingButton>
        </>
      }
    >
      {/* 1. Employee Context Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 16px",
          padding: "12px 16px",
          background: "rgba(37, 99, 235, 0.04)",
          borderRadius: 8,
          marginBottom: 18,
          border: "1px solid rgba(37, 99, 235, 0.12)",
          fontSize: 12.8,
        }}
      >
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>EMPLOYEE</span>
          <strong style={{ color: "#0f172a", fontSize: 13.5 }}>{request.employee_name}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>IDENTIFIER</span>
          <span style={{ color: "#0f172a", fontFamily: "var(--font-mono, monospace)", fontSize: 12.5 }}>
            {request.identifier || request.employee_email}
          </span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ASSIGNED TEAM</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{request.employee_team || "Engineering Team"}</span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ROLE</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{request.employee_role || "Software Engineer"}</span>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
          <span className="spinner spinner-dark" style={{ width: 22, height: 22, display: "inline-block", marginBottom: 10 }} />
          <div style={{ fontSize: 13 }}>Loading live GitHub Teams...</div>
        </div>
      ) : (
        <>
          {/* Target GitHub Team */}
          <div className="field" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                Target GitHub Team
              </label>
              {request.employee_team && isAutoMatched && (
                <span
                  style={{
                    fontSize: 11,
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  🎯 Auto-selected for {request.employee_team}
                </span>
              )}
            </div>
            <select
              className="input"
              style={{ width: "100%", height: 38, fontSize: 13.5 }}
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setIsAutoMatched(false);
              }}
            >
              {teams.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} (@{t.slug})
                </option>
              ))}
              {teams.length === 0 && (
                <option value="developers">developers (Default)</option>
              )}
            </select>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
              The employee will automatically receive all repository permissions granted to this team.
            </div>
          </div>

          {/* GitHub Team Role */}
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>
              Team Role
            </label>
            <select
              className="input"
              style={{ width: "100%", height: 38, fontSize: 13.5 }}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="member">Member (Standard contributor access)</option>
              <option value="maintainer">Maintainer (Can manage team membership and settings)</option>
            </select>
          </div>
        </>
      )}
    </Modal>
  );
}

function JiraApprovalModal({ request, onClose, onConfirm, loading }) {
  const [groups, setGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [isAutoMatched, setIsAutoMatched] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchJiraGroups(), fetchJiraProjects()])
      .then(([gRes, pRes]) => {
        if (!active) return;
        const gList = Array.isArray(gRes.data) ? gRes.data : [];
        const pList = Array.isArray(pRes.data) ? pRes.data : [];
        setGroups(gList);
        setProjects(pList);

        // Auto-select group
        const matchedGroup = findMatchingGroup(gList, request.employee_team);
        setSelectedGroup(matchedGroup || (gList[0] ? gList[0].name : "jira-software-users"));
        setIsAutoMatched(true);

        // Auto-select projects matching employee team
        if (pList.length > 0) {
          const cleanTeam = (request.employee_team || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const matchingProjects = pList.filter((p) => {
            const cleanKey = p.key.toLowerCase();
            const cleanName = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            return cleanTeam.includes(cleanKey) || cleanTeam.includes(cleanName) || cleanName.includes(cleanTeam);
          });
          if (matchingProjects.length > 0) {
            setSelectedProjects(matchingProjects.map((p) => p.key));
          } else {
            // Default to all active projects
            setSelectedProjects(pList.map((p) => p.key));
          }
        }
      })
      .catch((err) => console.warn("Failed to load Jira metadata", err))
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [request.employee_team]);

  const toggleProject = (key) => {
    setSelectedProjects((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Modal
      title={`Configure Jira Access — ${request.employee_name}`}
      onClose={onClose}
      width={600}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <LoadingButton
            className="btn btn-primary"
            loading={loading}
            onClick={() =>
              onConfirm({
                jira_group: selectedGroup,
                jira_project_keys: selectedProjects,
              })
            }
          >
            Confirm & Grant Jira Access
          </LoadingButton>
        </>
      }
    >
      {/* 1. Employee Context Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 16px",
          padding: "12px 16px",
          background: "rgba(37, 99, 235, 0.04)",
          borderRadius: 8,
          marginBottom: 18,
          border: "1px solid rgba(37, 99, 235, 0.12)",
          fontSize: 12.8,
        }}
      >
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>EMPLOYEE</span>
          <strong style={{ color: "#0f172a", fontSize: 13.5 }}>{request.employee_name}</strong>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>EMAIL</span>
          <span style={{ color: "#0f172a", fontFamily: "var(--font-mono, monospace)", fontSize: 12.5 }}>
            {request.employee_email}
          </span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ASSIGNED TEAM</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{request.employee_team || "Engineering Team"}</span>
        </div>
        <div>
          <span style={{ color: "#64748b", display: "block", fontSize: 11, marginBottom: 2 }}>ROLE</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{request.employee_role || "Software Engineer"}</span>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
          <span className="spinner spinner-dark" style={{ width: 22, height: 22, display: "inline-block", marginBottom: 10 }} />
          <div style={{ fontSize: 13 }}>Loading live Jira Groups & Projects...</div>
        </div>
      ) : (
        <>
          {/* Jira User Group */}
          <div className="field" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                Primary Jira User Group
              </label>
              {request.employee_team && isAutoMatched && (
                <span
                  style={{
                    fontSize: 11,
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#059669",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  🎯 Auto-selected for {request.employee_team}
                </span>
              )}
            </div>
            <select
              className="input"
              style={{ width: "100%", height: 38, fontSize: 13.5 }}
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setIsAutoMatched(false);
              }}
            >
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
              {groups.length === 0 && (
                <option value="jira-software-users">jira-software-users (Default)</option>
              )}
            </select>
          </div>

          {/* Project Assignments */}
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>
              Assign to Jira Projects (Member Role)
            </label>
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: 6,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {projects.map((p) => {
                const isChecked = selectedProjects.includes(p.key);
                return (
                  <label
                    key={p.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: isChecked ? "rgba(37, 99, 235, 0.05)" : "#ffffff",
                      border: isChecked ? "1px solid #3b82f6" : "1px solid #f1f5f9",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleProject(p.key)}
                      style={{ width: 16, height: 16, accentColor: "#2563eb" }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: isChecked ? "#1d4ed8" : "#0f172a" }}>
                        {p.name}
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                        ({p.key})
                      </span>
                    </div>
                  </label>
                );
              })}
              {projects.length === 0 && (
                <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: 12 }}>
                  No active projects found in Jira
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>
              The employee will be added as a project Member so they can view boards, create, and resolve issues.
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function ToolRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [actingOn, setActingOn] = useState(null); // request id currently being approved/rejected
  const [awsModalReq, setAwsModalReq] = useState(null);
  const [githubModalReq, setGithubModalReq] = useState(null);
  const [jiraModalReq, setJiraModalReq] = useState(null);

  function load(currentFilter) {
    setLoading(true);
    fetchToolRequests(currentFilter || undefined)
      .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => setError(extractErrorMessage(err, "Could not load tool requests.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function handleApproveClick(req) {
    if (req.provider_key === "aws") {
      setAwsModalReq(req);
    } else if (req.provider_key === "github") {
      setGithubModalReq(req);
    } else if (req.provider_key === "jira") {
      setJiraModalReq(req);
    } else {
      executeApprove(req);
    }
  }

  async function executeApprove(req, payload = null) {
    setActingOn(req.id);
    try {
      const { data } = await approveToolRequest(req.id, payload);
      if (data.status === "approved") {
        toast.success(`Approved — ${data.provisioning_message || "access granted"}`);
      } else {
        toast.error(data.provisioning_message || "Approval did not complete as expected.");
      }
      setAwsModalReq(null);
      setGithubModalReq(null);
      setJiraModalReq(null);
      load(filter);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not approve this request."));
      load(filter);
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(req) {
    setActingOn(req.id);
    try {
      await rejectToolRequest(req.id);
      toast.success("Request rejected.");
      load(filter);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not reject this request."));
    } finally {
      setActingOn(null);
    }
  }

  async function handleRevoke(req) {
    setActingOn(req.id);
    try {
      const { data } = await revokeToolRequest(req.id);
      toast.success(`Revoked — ${data.provisioning_message || "access removed"}`);
      load(filter);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not revoke this request."));
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 18 }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>Tool Access Requests</h1>
          <p>
            Review employee requests for tool access. Approving a tool with an automated connector
            (GitHub, Jira, AWS) grants real access immediately.
          </p>
        </div>
      </div>

      <div className="row-actions" style={{ marginBottom: 14, gap: 6 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`btn btn-sm ${filter === f.value ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="top-align-error">{error}</div>}

      <div className="card">
        {loading ? (
          <PageLoading />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests here"
            description="There are no tool access requests matching this filter."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Tool</th>
                  <th>Identifier</th>
                  <th>Reason</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="cell-name">{r.employee_name}</div>
                      <div className="cell-muted">{r.employee_email}</div>
                      {(r.employee_team || r.employee_role) && (
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {r.employee_team}
                          {r.employee_team && r.employee_role ? " • " : ""}
                          {r.employee_role}
                        </div>
                      )}
                    </td>
                    <td className="cell-name">
                      <div>{r.tool_name}</div>
                      {r.provider_key && (
                        <span
                          style={{
                            fontSize: 10.5,
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(37, 99, 235, 0.08)",
                            color: "#2563eb",
                            fontWeight: 600,
                            display: "inline-block",
                            marginTop: 3,
                          }}
                        >
                          {r.provider_key} (Auto)
                        </span>
                      )}
                    </td>
                    <td className="cell-muted">{r.identifier || "—"}</td>
                    <td
                      className="cell-muted"
                      style={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.reason || "—"}
                    </td>
                    <td className="cell-muted">
                      {r.requested_at ? new Date(r.requested_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.provisioning_message && r.status !== "pending" && (
                        <div className="cell-muted" style={{ marginTop: 4, maxWidth: 240, fontSize: 11.5 }}>
                          {r.provisioning_message}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.status === "pending" && (
                        <div className="row-actions">
                          <LoadingButton
                            className="btn btn-primary btn-sm"
                            loading={actingOn === r.id}
                            onClick={() => handleApproveClick(r)}
                          >
                            Approve
                          </LoadingButton>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={actingOn === r.id}
                            onClick={() => handleReject(r)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status === "approved" && (
                        <LoadingButton
                          className="btn btn-danger btn-sm"
                          loading={actingOn === r.id}
                          onClick={() => handleRevoke(r)}
                        >
                          Revoke
                        </LoadingButton>
                      )}
                      {r.status !== "pending" && r.status !== "approved" && (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {r.reviewed_at
                            ? `Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}`
                            : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AWS Dynamic Permission & Policy Modal */}
      {awsModalReq && (
        <AwsApprovalModal
          request={awsModalReq}
          onClose={() => setAwsModalReq(null)}
          onConfirm={(payload) => executeApprove(awsModalReq, payload)}
          loading={actingOn === awsModalReq.id}
        />
      )}

      {/* GitHub Dynamic Team & Role Modal */}
      {githubModalReq && (
        <GitHubApprovalModal
          request={githubModalReq}
          onClose={() => setGithubModalReq(null)}
          onConfirm={(payload) => executeApprove(githubModalReq, payload)}
          loading={actingOn === githubModalReq.id}
        />
      )}

      {/* Jira Dynamic Group & Project Assignment Modal */}
      {jiraModalReq && (
        <JiraApprovalModal
          request={jiraModalReq}
          onClose={() => setJiraModalReq(null)}
          onConfirm={(payload) => executeApprove(jiraModalReq, payload)}
          loading={actingOn === jiraModalReq.id}
        />
      )}
    </div>
  );
}
