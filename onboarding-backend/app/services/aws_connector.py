import re
import secrets
import string
from typing import Optional
from app.config import settings


class AwsConnector:
    """Automated AWS IAM user and access provisioning connector using boto3."""

    def __init__(self):
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.region = settings.AWS_REGION or "us-east-1"
        self.default_group = settings.AWS_DEFAULT_IAM_GROUP
        self.account_id = settings.AWS_ACCOUNT_ID

    def _check_configured(self):
        # Refresh from settings in case .env was updated at runtime
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.region = settings.AWS_REGION or "us-east-1"
        self.default_group = settings.AWS_DEFAULT_IAM_GROUP
        self.account_id = settings.AWS_ACCOUNT_ID

        if not self.access_key or not self.secret_key:
            raise RuntimeError(
                "AWS integration is not configured. Set AWS_ACCESS_KEY_ID and "
                "AWS_SECRET_ACCESS_KEY in .env"
            )

    def _get_iam_client(self):
        import boto3
        return boto3.client(
            "iam",
            aws_access_key_id=self.access_key.strip(),
            aws_secret_access_key=self.secret_key.strip(),
            region_name=self.region.strip() if self.region else "us-east-1"
        )

    def _get_sts_client(self):
        import boto3
        return boto3.client(
            "sts",
            aws_access_key_id=self.access_key.strip(),
            aws_secret_access_key=self.secret_key.strip(),
            region_name=self.region.strip() if self.region else "us-east-1"
        )

    def _sanitize_username(self, identifier: str) -> str:
        """Sanitizes an employee identifier/email into a valid AWS IAM username.
        AWS IAM allows alphanumeric characters and +=,.@- up to 64 characters.
        """
        raw = identifier.strip()
        # Keep valid characters
        cleaned = re.sub(r"[^\w+=,.@-]", "-", raw)
        # Limit to 64 characters max
        return cleaned[:64]

    def _generate_temp_password(self, length: int = 16) -> str:
        """Generates a secure temporary password complying with AWS IAM password policies."""
        upper = secrets.choice(string.ascii_uppercase)
        lower = secrets.choice(string.ascii_lowercase)
        digit = secrets.choice(string.digits)
        symbol = secrets.choice("!@#$%^&*()_+-=")
        remainder_chars = string.ascii_letters + string.digits + "!@#$%^&*()_+-="
        remainder = [secrets.choice(remainder_chars) for _ in range(length - 4)]
        combined = [upper, lower, digit, symbol] + remainder
        secrets.SystemRandom().shuffle(combined)
        return "".join(combined)

    def _get_console_signin_url(self) -> str:
        """Resolves the direct AWS Console sign-in URL."""
        if self.account_id and self.account_id.strip():
            return f"https://{self.account_id.strip()}.signin.aws.amazon.com/console"

        try:
            sts = self._get_sts_client()
            acct = sts.get_caller_identity().get("Account")
            if acct:
                return f"https://{acct}.signin.aws.amazon.com/console"
        except Exception:
            pass

        return "https://console.aws.amazon.com"

    def list_groups(self) -> list[dict]:
        """Returns all IAM groups available in the AWS account along with their attached policies."""
        self._check_configured()
        iam = self._get_iam_client()
        try:
            resp = iam.list_groups()
            result = []
            for g in resp.get("Groups", []):
                g_name = g["GroupName"]
                attached = []
                try:
                    p_resp = iam.list_attached_group_policies(GroupName=g_name)
                    attached = [
                        {"name": p["PolicyName"], "arn": p["PolicyArn"]}
                        for p in p_resp.get("AttachedPolicies", [])
                    ]
                except Exception as pe:
                    logger.warning(f"Could not list attached policies for group {g_name}: {pe}")

                result.append({
                    "name": g_name,
                    "arn": g["Arn"],
                    "attached_policies": attached,
                    "created_at": g.get("CreateDate").isoformat() if g.get("CreateDate") else None
                })
            return result
        except Exception as e:
            raise RuntimeError(f"AWS API error listing IAM groups: {e}")

    def list_common_policies(self) -> list[dict]:
        """Returns standard common AWS managed policies plus any customer managed policies."""
        self._check_configured()
        iam = self._get_iam_client()

        curated = [
            {"name": "ReadOnlyAccess", "arn": "arn:aws:iam::aws:policy/ReadOnlyAccess", "description": "Read-only access to all AWS services and resources."},
            {"name": "AmazonS3ReadOnlyAccess", "arn": "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess", "description": "Read-only access to all S3 buckets and objects."},
            {"name": "AmazonS3FullAccess", "arn": "arn:aws:iam::aws:policy/AmazonS3FullAccess", "description": "Full access to Amazon S3 resources."},
            {"name": "AmazonEC2ReadOnlyAccess", "arn": "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess", "description": "Read-only access to EC2 instances and networking."},
            {"name": "PowerUserAccess", "arn": "arn:aws:iam::aws:policy/PowerUserAccess", "description": "Full access to AWS services, excluding IAM user/group management."},
            {"name": "AWSCloudFormationReadOnlyAccess", "arn": "arn:aws:iam::aws:policy/AWSCloudFormationReadOnlyAccess", "description": "Read-only access to CloudFormation stacks and templates."},
            {"name": "AmazonRDSReadOnlyAccess", "arn": "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess", "description": "Read-only access to Amazon RDS databases and clusters."},
            {"name": "CloudWatchReadOnlyAccess", "arn": "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess", "description": "Read-only access to CloudWatch logs, metrics, and alarms."},
        ]

        try:
            local_resp = iam.list_policies(Scope="Local", MaxItems=50)
            for p in local_resp.get("Policies", []):
                curated.append({
                    "name": p["PolicyName"],
                    "arn": p["Arn"],
                    "description": p.get("Description") or "Customer Managed Policy"
                })
        except Exception as e:
            logger.warning(f"Could not list customer managed policies: {e}")

        return curated

    def grant_access(
        self,
        identifier: str,
        group_name: Optional[str] = None,
        policy_arns: Optional[list[str]] = None
    ) -> str:
        """Creates an AWS IAM user, generates a temporary console password (requiring change on first login),
        and assigns them to the specified IAM group and policies.
        """
        self._check_configured()
        username = self._sanitize_username(identifier)
        if not username:
            raise RuntimeError(f"Invalid identifier '{identifier}' for AWS username.")

        iam = self._get_iam_client()

        # 1. Check if user exists, create if not
        user_exists = False
        try:
            iam.get_user(UserName=username)
            user_exists = True
        except Exception as e:
            if "NoSuchEntity" in str(e):
                user_exists = False
            else:
                raise RuntimeError(f"AWS API error checking user '{username}': {e}")

        if not user_exists:
            try:
                iam.create_user(
                    UserName=username,
                    Tags=[
                        {"Key": "ProvisionedBy", "Value": "EmployeeOnboardingAssistant"},
                        {"Key": "OriginalIdentifier", "Value": identifier[:250]}
                    ]
                )
            except Exception as e:
                raise RuntimeError(f"AWS API error creating user '{username}': {e}")

        # 2. Check or create Login Profile (Console Password)
        has_login_profile = False
        temp_password = None
        try:
            iam.get_login_profile(UserName=username)
            has_login_profile = True
        except Exception:
            has_login_profile = False

        if not has_login_profile:
            temp_password = self._generate_temp_password(16)
            try:
                iam.create_login_profile(
                    UserName=username,
                    Password=temp_password,
                    PasswordResetRequired=True
                )
            except Exception as e:
                raise RuntimeError(f"AWS API error creating login profile for '{username}': {e}")

        # Ensure IAMUserChangePassword policy is attached so user can change password on first login
        try:
            iam.attach_user_policy(
                UserName=username,
                PolicyArn="arn:aws:iam::aws:policy/IAMUserChangePassword"
            )
        except Exception:
            pass

        # 3. Add to specified group or default group
        target_group = (group_name or self.default_group or "").strip()
        group_note = ""
        if target_group:
            try:
                iam.add_user_to_group(GroupName=target_group, UserName=username)
                group_note = f" (Group: {target_group})"
            except Exception as e:
                if "LimitExceeded" in str(e) or "Conflict" in str(e):
                    group_note = f" (Group: {target_group})"
                else:
                    group_note = f" (Note: Group '{target_group}' assignment skipped: {e})"

        # 4. Attach extra policies if specified
        attached_policies = []
        if policy_arns:
            for arn in policy_arns:
                clean_arn = arn.strip() if isinstance(arn, str) else ""
                if clean_arn and clean_arn.startswith("arn:aws:iam:"):
                    try:
                        iam.attach_user_policy(UserName=username, PolicyArn=clean_arn)
                        p_name = clean_arn.split("/")[-1]
                        attached_policies.append(p_name)
                    except Exception as pe:
                        logger.warning(f"Failed to attach policy {clean_arn} to {username}: {pe}")

        policies_note = f" (Policies: {', '.join(attached_policies)})" if attached_policies else ""
        console_url = self._get_console_signin_url()

        if temp_password:
            return (
                f"Created AWS IAM user '{username}'{group_note}{policies_note}. "
                f"Console Login URL: {console_url} | Temporary Password: {temp_password} "
                f"(Password change required on first sign-in)"
            )
        else:
            return (
                f"AWS IAM user '{username}' already exists{group_note}{policies_note}. "
                f"Console Login URL: {console_url}"
            )

    def revoke_access(self, identifier: str) -> str:
        """Revokes all AWS access for the user by deleting login profile, access keys, group memberships, and user."""
        self._check_configured()
        username = self._sanitize_username(identifier)
        iam = self._get_iam_client()

        # Check if user exists
        try:
            iam.get_user(UserName=username)
        except Exception as e:
            if "NoSuchEntity" in str(e):
                return f"User '{username}' does not exist in AWS IAM (access already removed or never created)"
            raise RuntimeError(f"AWS API error checking user: {e}")

        # 1. Delete login profile
        try:
            iam.delete_login_profile(UserName=username)
        except Exception:
            pass

        # 2. Remove from groups
        try:
            groups_resp = iam.list_groups_for_user(UserName=username)
            for g in groups_resp.get("Groups", []):
                try:
                    iam.remove_user_from_group(GroupName=g["GroupName"], UserName=username)
                except Exception as ge:
                    print(f"Warning removing user from group {g.get('GroupName')}: {ge}")
        except Exception as e:
            print(f"Warning listing groups for user {username}: {e}")

        # Also ensure removal from default_group if set
        if self.default_group and self.default_group.strip():
            try:
                iam.remove_user_from_group(GroupName=self.default_group.strip(), UserName=username)
            except Exception:
                pass

        # 3. Delete access keys
        try:
            keys_resp = iam.list_access_keys(UserName=username)
            for k in keys_resp.get("AccessKeyMetadata", []):
                try:
                    iam.delete_access_key(UserName=username, AccessKeyId=k["AccessKeyId"])
                except Exception:
                    pass
        except Exception:
            pass

        # 4. Detach attached policies
        try:
            policies_resp = iam.list_attached_user_policies(UserName=username)
            for p in policies_resp.get("AttachedPolicies", []):
                try:
                    iam.detach_user_policy(UserName=username, PolicyArn=p["PolicyArn"])
                except Exception:
                    pass
        except Exception:
            pass

        # 5. Delete inline policies
        try:
            inline_resp = iam.list_user_policies(UserName=username)
            for pname in inline_resp.get("PolicyNames", []):
                try:
                    iam.delete_user_policy(UserName=username, PolicyName=pname)
                except Exception:
                    pass
        except Exception:
            pass

        # 6. Delete the IAM user
        try:
            iam.delete_user(UserName=username)
        except Exception as e:
            raise RuntimeError(f"AWS API error deleting user '{username}': {e}")

        return f"Revoked AWS access for user '{username}' (IAM user, login profile, and credentials removed)"

