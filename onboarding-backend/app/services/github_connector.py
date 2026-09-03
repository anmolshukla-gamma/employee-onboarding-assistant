import logging
from typing import Optional
import requests
from app.config import settings

logger = logging.getLogger(__name__)
GITHUB_API = "https://api.github.com"


class GitHubConnector:
    def __init__(self):
        self.token = settings.GITHUB_TOKEN
        self.org = settings.GITHUB_ORG
        self.team_slug = settings.GITHUB_TEAM_SLUG

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _check_configured(self):
        if not self.token or not self.org or not self.team_slug:
            raise RuntimeError(
                "GitHub integration is not configured. Set GITHUB_TOKEN, "
                "GITHUB_ORG and GITHUB_TEAM_SLUG in .env"
            )

    def _resolve_username_by_email(self, email: str) -> Optional[str]:
        """Looks up the employee's known GitHub username from previous requests or user record."""
        try:
            from app.database import SessionLocal
            from app.models.user import User
            from app.models.team import ToolAccessRequest

            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email.ilike(email.strip())).first()
                if user:
                    req = (
                        db.query(ToolAccessRequest)
                        .filter(
                            ToolAccessRequest.employee_id == user.id,
                            ~ToolAccessRequest.identifier.contains("@"),
                            ToolAccessRequest.identifier != None,
                            ToolAccessRequest.identifier != "",
                        )
                        .order_by(ToolAccessRequest.id.desc())
                        .first()
                    )
                    if req and req.identifier:
                        return req.identifier.strip()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Error resolving username by email {email}: {e}")
        return None

    def grant_access(self, identifier: str) -> str:
        self._check_configured()
        identifier = identifier.strip()

        if "@" in identifier:
            team = self._get_team_id()
            url = f"{GITHUB_API}/orgs/{self.org}/invitations"
            resp = requests.post(
                url,
                headers=self._headers(),
                json={
                    "email": identifier,
                    "role": "direct_member",
                    "team_ids": [team],
                },
            )
            if resp.status_code in (200, 201):
                return f"Invited '{identifier}' by email to org '{self.org}' (team: {self.team_slug})"

            # If user is already a member of the organization
            if resp.status_code == 422 and "already a part of this organization" in resp.text:
                resolved_username = self._resolve_username_by_email(identifier)
                if resolved_username:
                    team_resp = requests.put(
                        f"{GITHUB_API}/orgs/{self.org}/teams/{self.team_slug}/memberships/{resolved_username}",
                        headers=self._headers(),
                        json={"role": "member"},
                    )
                    if team_resp.status_code in (200, 201):
                        return (
                            f"User '{identifier}' is already in org '{self.org}'. "
                            f"Added GitHub username '{resolved_username}' directly to team '{self.team_slug}'."
                        )

                raise RuntimeError(
                    f"User with email '{identifier}' is already an active member of GitHub organization '{self.org}'. "
                    f"To assign them to the team '{self.team_slug}', please submit the request using their GitHub username."
                )

            raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
        else:
            url = f"{GITHUB_API}/orgs/{self.org}/teams/{self.team_slug}/memberships/{identifier}"
            resp = requests.put(url, headers=self._headers(), json={"role": "member"})

            if resp.status_code == 404:
                raise RuntimeError(
                    f"GitHub username '{identifier}' not found. If this person doesn't have "
                    f"a GitHub account yet, use their email address instead so they can be invited."
                )
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")

            data = resp.json()
            return f"Added '{identifier}' to team '{self.team_slug}' (state: {data.get('state', 'unknown')})"

    def _get_team_id(self) -> int:
        url = f"{GITHUB_API}/orgs/{self.org}/teams/{self.team_slug}"
        resp = requests.get(url, headers=self._headers())
        if resp.status_code != 200:
            raise RuntimeError(f"Could not resolve team id: {resp.text}")
        return resp.json()["id"]

    def _remove_user_from_org(self, username: str) -> str:
        """Removes user from both the team and the organization completely."""
        # 1. Remove from team
        team_url = f"{GITHUB_API}/orgs/{self.org}/teams/{self.team_slug}/memberships/{username}"
        requests.delete(team_url, headers=self._headers())

        # 2. Remove from organization
        org_url = f"{GITHUB_API}/orgs/{self.org}/members/{username}"
        resp = requests.delete(org_url, headers=self._headers())
        if resp.status_code not in (204, 200, 404):
            raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
        return f"Removed '{username}' from team '{self.team_slug}' and organization '{self.org}'"

    def revoke_access(self, identifier: str) -> str:
        self._check_configured()
        identifier = identifier.strip()

        if "@" in identifier:
            invitation_id = self._find_pending_invitation_id(identifier)
            if invitation_id is not None:
                url = f"{GITHUB_API}/orgs/{self.org}/invitations/{invitation_id}"
                resp = requests.delete(url, headers=self._headers())
                if resp.status_code not in (204, 200):
                    raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
                return f"Cancelled pending invitation for '{identifier}'"

            # If no pending invitation was found, user may have already accepted and joined the org
            resolved_username = self._resolve_username_by_email(identifier)
            if resolved_username:
                return self._remove_user_from_org(resolved_username)

            return (
                f"No pending invitation found for '{identifier}'. If the user already accepted the invitation, "
                f"please revoke using their GitHub username to remove them from organization '{self.org}'."
            )
        else:
            return self._remove_user_from_org(identifier)

    def _find_pending_invitation_id(self, email: str):
        url = f"{GITHUB_API}/orgs/{self.org}/invitations"
        resp = requests.get(url, headers=self._headers())
        if resp.status_code != 200:
            raise RuntimeError(f"Could not list invitations: {resp.text}")

        for invite in resp.json():
            if invite.get("email") and invite.get("email").lower() == email.lower():
                return invite["id"]
        return None