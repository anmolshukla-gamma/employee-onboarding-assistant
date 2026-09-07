import requests
from typing import Optional, Dict, Any
from app.config import settings


class JiraConnector:
    """Automated Jira Cloud access provisioning connector using Jira Cloud REST API v3."""

    def __init__(self):
        self.domain = settings.JIRA_DOMAIN
        self.admin_email = settings.JIRA_ADMIN_EMAIL
        self.token = settings.JIRA_API_TOKEN
        self.default_group = settings.JIRA_DEFAULT_GROUP or "jira-software-users"

    def _check_configured(self):
        # Re-read from settings in case .env was modified at runtime
        self.domain = settings.JIRA_DOMAIN
        self.admin_email = settings.JIRA_ADMIN_EMAIL
        self.token = settings.JIRA_API_TOKEN
        self.default_group = settings.JIRA_DEFAULT_GROUP or "jira-software-users"

        if not self.domain or not self.admin_email or not self.token:
            raise RuntimeError(
                "Jira integration is not configured. Set JIRA_DOMAIN, "
                "JIRA_ADMIN_EMAIL, and JIRA_API_TOKEN in .env"
            )

    def _base_url(self) -> str:
        domain = self.domain.strip().rstrip("/")
        if domain.startswith("https://"):
            domain = domain[len("https://"):]
        elif domain.startswith("http://"):
            domain = domain[len("http://"):]
        return f"https://{domain}"

    def _auth(self) -> tuple[str, str]:
        return (self.admin_email.strip(), self.token.strip())

    def _headers(self) -> dict:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _resolve_group_name(self) -> str:
        """Checks if the configured default group exists, or auto-discovers the site's Jira software group."""
        base = self._base_url()
        # 1. First test the default group directly
        test_url = f"{base}/rest/api/3/group/member?groupname={self.default_group}&maxResults=1"
        try:
            resp = requests.get(test_url, auth=self._auth(), headers=self._headers(), timeout=10)
            if resp.status_code == 200:
                return self.default_group
        except Exception:
            pass

        # 2. If not found (e.g. Jira appended the site suffix like jira-software-users-<sitename>),
        # query the group picker to auto-discover it
        try:
            picker_url = f"{base}/rest/api/3/groups/picker?query=jira"
            resp = requests.get(picker_url, auth=self._auth(), headers=self._headers(), timeout=10)
            if resp.status_code == 200:
                groups = resp.json().get("groups", [])
                for g in groups:
                    name = g.get("name", "")
                    if "jira-software-users" in name or "jira-users" in name:
                        return name
                if groups:
                    return groups[0].get("name", self.default_group)
        except Exception:
            pass

        return self.default_group

    def _find_user(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Finds a Jira user by email or username/accountId."""
        base = self._base_url()
        url = f"{base}/rest/api/3/user/search?query={identifier}"
        resp = requests.get(url, auth=self._auth(), headers=self._headers(), timeout=15)
        if resp.status_code != 200:
            return None

        users = resp.json()
        if not isinstance(users, list) or not users:
            return None

        clean_id = identifier.lower().strip()
        # Prefer exact email match
        for u in users:
            if u.get("emailAddress", "").lower() == clean_id or u.get("accountId") == identifier:
                return u
        return users[0]

    def _invite_user(self, email: str) -> str:
        """Invites a new employee by email to Jira Cloud and returns their accountId."""
        base = self._base_url()
        url = f"{base}/rest/api/3/user"
        payload = {
            "emailAddress": email,
            "products": ["jira-software"]
        }
        resp = requests.post(url, auth=self._auth(), headers=self._headers(), json=payload, timeout=15)

        if resp.status_code in (200, 201):
            return resp.json().get("accountId")

        # If user already exists or needs email search fallback
        existing = self._find_user(email)
        if existing and existing.get("accountId"):
            return existing["accountId"]

        error_msg = resp.text
        try:
            err_json = resp.json()
            if "errorMessages" in err_json and err_json["errorMessages"]:
                error_msg = "; ".join(err_json["errorMessages"])
            elif "errors" in err_json:
                error_msg = str(err_json["errors"])
        except Exception:
            pass

        raise RuntimeError(f"Could not invite user to Jira ({resp.status_code}): {error_msg}")

    def list_groups(self) -> list[dict]:
        """Returns all user groups in Jira Cloud."""
        self._check_configured()
        base = self._base_url()
        url = f"{base}/rest/api/3/groups/picker?maxResults=50"
        resp = requests.get(url, auth=self._auth(), headers=self._headers(), timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(f"Jira API error listing groups ({resp.status_code}): {resp.text}")
        groups = resp.json().get("groups", [])
        return [{"name": g["name"]} for g in groups]

    def list_projects(self) -> list[dict]:
        """Returns all active projects in Jira Cloud."""
        self._check_configured()
        base = self._base_url()
        url = f"{base}/rest/api/3/project"
        resp = requests.get(url, auth=self._auth(), headers=self._headers(), timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(f"Jira API error listing projects ({resp.status_code}): {resp.text}")
        return [
            {
                "id": p["id"],
                "key": p["key"],
                "name": p["name"],
                "project_type": p.get("projectTypeKey", "software"),
            }
            for p in resp.json()
        ]

    def _assign_project_role(self, project_key: str, account_id: str) -> Optional[str]:
        """Assigns the user to the Member role of a project."""
        base = self._base_url()
        roles_url = f"{base}/rest/api/3/project/{project_key}/role"
        resp = requests.get(roles_url, auth=self._auth(), headers=self._headers(), timeout=15)
        if resp.status_code != 200:
            return None

        roles = resp.json()
        # Look for 'Member', 'Developers', or fallback to first non-Administrator role
        target_role_url = roles.get("Member") or roles.get("Developers")
        if not target_role_url:
            for r_name, r_url in roles.items():
                if "admin" not in r_name.lower():
                    target_role_url = r_url
                    break

        if not target_role_url:
            return None

        role_id = target_role_url.rstrip("/").split("/")[-1]
        assign_url = f"{base}/rest/api/3/project/{project_key}/role/{role_id}"
        add_resp = requests.post(
            assign_url,
            auth=self._auth(),
            headers=self._headers(),
            json={"user": [account_id]},
            timeout=15
        )
        if add_resp.status_code in (200, 201):
            return project_key
        return None

    def grant_access(
        self,
        identifier: str,
        group_name: Optional[str] = None,
        project_keys: Optional[list[str]] = None
    ) -> str:
        """Grants Jira access by finding or inviting the user, adding them to the target group, and assigning project roles."""
        self._check_configured()
        identifier = identifier.strip()

        # Step 1: Find or invite user to obtain accountId
        user = self._find_user(identifier)
        account_id = None
        display_name = identifier

        if user and user.get("accountId"):
            account_id = user["accountId"]
            display_name = user.get("displayName") or user.get("emailAddress") or identifier
        elif "@" in identifier:
            account_id = self._invite_user(identifier)
        else:
            raise RuntimeError(
                f"Jira user '{identifier}' was not found. Please provide the employee's email "
                f"address so they can be invited to Jira."
            )

        if not account_id:
            raise RuntimeError(f"Could not resolve a valid Jira account ID for '{identifier}'")

        # Step 2: Resolve the target Jira group
        active_group = group_name.strip() if group_name and group_name.strip() else self._resolve_group_name()

        # Step 3: Add user to group
        base = self._base_url()
        url = f"{base}/rest/api/3/group/user?groupname={active_group}"
        resp = requests.post(
            url,
            auth=self._auth(),
            headers=self._headers(),
            json={"accountId": account_id},
            timeout=15
        )

        group_success = resp.status_code in (200, 201) or (
            resp.status_code == 400 and ("already" in resp.text.lower() or "member" in resp.text.lower())
        )
        if not group_success:
            raise RuntimeError(f"Jira API error adding user to group ({resp.status_code}): {resp.text}")

        # Step 4: Assign to specific projects if provided
        assigned_projects = []
        if project_keys:
            for p_key in project_keys:
                clean_key = p_key.strip().upper()
                if clean_key:
                    res = self._assign_project_role(clean_key, account_id)
                    if res:
                        assigned_projects.append(res)

        msg = f"Granted Jira access to '{display_name}' (Group: {active_group})"
        if assigned_projects:
            msg += f" (Projects: {', '.join(assigned_projects)})"
        return msg

    def revoke_access(self, identifier: str) -> str:
        """Revokes Jira access by dynamically identifying the user's groups and removing them."""
        self._check_configured()
        identifier = identifier.strip()

        user = self._find_user(identifier)
        if not user or not user.get("accountId"):
            return f"User '{identifier}' not found in Jira (access may already be revoked or never granted)"

        account_id = user["accountId"]
        base = self._base_url()

        # Step 1: Discover all groups the user actually belongs to
        target_groups = set()
        try:
            u_resp = requests.get(
                f"{base}/rest/api/3/user?accountId={account_id}&expand=groups",
                auth=self._auth(),
                headers=self._headers(),
                timeout=15,
            )
            if u_resp.status_code == 200:
                for g in u_resp.json().get("groups", {}).get("items", []):
                    name = g.get("name")
                    # Do not accidentally remove administrative / org admin roles
                    if name and name not in ("org-admins", "site-admins", "system-administrators"):
                        target_groups.add(name)
        except Exception:
            pass

        # Fallback to resolved default group if none found
        default_group = self._resolve_group_name()
        if default_group:
            target_groups.add(default_group)

        removed_from = []
        for group_name in target_groups:
            url = f"{base}/rest/api/3/group/user?groupname={group_name}&accountId={account_id}"
            resp = requests.delete(url, auth=self._auth(), headers=self._headers(), timeout=15)

            if resp.status_code in (200, 204):
                removed_from.append(group_name)
            elif resp.status_code in (400, 404):
                # User was not a member of this specific group — perfectly fine
                pass
            else:
                raise RuntimeError(f"Jira API error revoking group access ({resp.status_code}): {resp.text}")

        if removed_from:
            return f"Revoked Jira access for '{identifier}' (removed from group(s): {', '.join(removed_from)})"
        return f"Revoked Jira access for '{identifier}' (user was already not in any assigned Jira groups)"

