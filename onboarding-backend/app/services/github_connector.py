import requests
from app.config import settings

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

    def grant_access(self, identifier: str) -> str:
        self._check_configured()

        if "@" in identifier:
            # Email invite — works whether or not they have a GitHub account yet
            team = self._get_team_id()
            url = f"{GITHUB_API}/orgs/{self.org}/invitations"
            resp = requests.post(url, headers=self._headers(), json={
                "email": identifier,
                "role": "direct_member",
                "team_ids": [team]
            })
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
            return f"Invited '{identifier}' by email to org '{self.org}' (team: {self.team_slug})"
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

    def revoke_access(self, identifier: str) -> str:
        self._check_configured()

        if "@" in identifier:
            invitation_id = self._find_pending_invitation_id(identifier)
            if invitation_id is None:
                return f"No pending invitation found for '{identifier}' (already accepted or never sent)"

            url = f"{GITHUB_API}/orgs/{self.org}/invitations/{invitation_id}"
            resp = requests.delete(url, headers=self._headers())
            if resp.status_code not in (204, 200):
                raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
            return f"Cancelled pending invitation for '{identifier}'"
        else:
            url = f"{GITHUB_API}/orgs/{self.org}/teams/{self.team_slug}/memberships/{identifier}"
            resp = requests.delete(url, headers=self._headers())
            if resp.status_code not in (204, 200):
                raise RuntimeError(f"GitHub API error ({resp.status_code}): {resp.text}")
            return f"Removed '{identifier}' from team '{self.team_slug}'"

    def _find_pending_invitation_id(self, email: str):
        url = f"{GITHUB_API}/orgs/{self.org}/invitations"
        resp = requests.get(url, headers=self._headers())
        if resp.status_code != 200:
            raise RuntimeError(f"Could not list invitations: {resp.text}")

        for invite in resp.json():
            if invite.get("email") == email:
                return invite["id"]
        return None