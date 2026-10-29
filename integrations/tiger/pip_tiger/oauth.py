"""Pip-owned OAuth registration with read scopes and a business-method allowlist.

The two underscore extension points are checked against pinned tigeropen 3.8.0.
The SDK's default scope selection requests every advertised scope, including writes;
Pip deliberately narrows that behavior before registration and token persistence.
"""

from pathlib import Path
import logging
import os
import sys

from tigeropen.auth.oauth2 import OAuth2Authentication, OAuth2SessionManager
from tigeropen.tiger_open_config import SERVER_URL, TIGER_PUBLIC_KEY, TigerOpenClientConfig

from .core import ProbeError

ISSUER = "https://openapi-oauth2.tigerfintech.com"
READ_SCOPES = frozenset({"api.basic:read", "api.quote:read", "api.account:read", "api.trade:read"})
READ_METHODS = frozenset({"accounts", "prime_assets", "positions", "active_orders", "order_transactions",
                          "get_quote_permission", "future_exchange", "future_contract_by_contract_code",
                          "future_contract_by_exchange_code", "future_real_time_quote"})


def validate_scopes(token):
    scopes = set((getattr(token, "scope", None) or "").split())
    if not scopes or not scopes.issubset(READ_SCOPES):
        raise ProbeError("READ_SCOPE_REQUIRED", "Authorize Pip with the supported read-only scopes; trade/write access is rejected.")
    return scopes


class ReadOnlySession(OAuth2SessionManager):
    def _scopes(self):
        advertised = set(self._metadata_of().scopes_supported)
        if not READ_SCOPES.issubset(advertised):
            raise ProbeError("SCOPE_METADATA_CHANGED", "Tiger's scope metadata changed; inspect the integration before authorizing.")
        return " ".join(sorted(READ_SCOPES))

    def _to_token(self, response, requested_scopes, client_id):
        token = super()._to_token(response, requested_scopes, client_id)
        validate_scopes(token)  # Runs before login/refresh persists a new token.
        return token


class ReadOnlyAuthentication(OAuth2Authentication):
    def apply(self, context):
        if context.params.get("method") not in READ_METHODS:
            raise ProbeError("METHOD_DENIED", "This Tiger probe permits only registered read methods.")
        token = self.session_manager.status()
        if token is None:
            raise ProbeError("AUTH_REQUIRED", "Enable Tiger OpenAPI, then run npm run tiger:login locally.")
        validate_scopes(token)
        return super().apply(context)


def auth_home():
    if sys.platform == "darwin":
        return Path.home() / "Library/Application Support/Pip/tiger"
    return Path.home() / ".local/share/pip/tiger"


def sessions(home=None):
    return ReadOnlySession(issuer=ISSUER, home=str(home or auth_home()), surface="pip-readonly",
                           client_name="Pip read-only broker access", authorize_timeout_seconds=120)


class OAuthOnlyConfig(TigerOpenClientConfig):
    # Do not load unrelated SDK signature credentials, endpoint overrides or local properties.
    def _load_env_vars(self):
        pass

    def _load_props(self):
        pass

    def load_token(self):
        return None


def client_config(session):
    config = OAuthOnlyConfig(enable_dynamic_domain=False)
    config.authentication = ReadOnlyAuthentication(session)
    config.private_key = ""
    config.tiger_id = ""
    config.secret_key = ""
    config.server_url = SERVER_URL
    config.quote_server_url = SERVER_URL
    config.tiger_public_key = TIGER_PUBLIC_KEY
    config.timeout = 10
    config.retry_max_tries = 0
    config.token_refresh_duration = 0
    return config


def quiet_sdk_logs():
    # SDK errors can contain request/account details. CLI prints only fixed, sanitized errors.
    for name in ("tigeropen", "tiger_openapi", "pip.tiger.sdk"):
        logger = logging.getLogger(name)
        logger.handlers = [logging.NullHandler()]
        logger.propagate = False
        logger.setLevel(logging.CRITICAL + 1)


def ensure_private_home(path=None):
    path = Path(path) if path is not None else auth_home()
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.is_symlink():
        raise ProbeError("AUTH_STORAGE", "Pip's authorization directory must be a private local directory.")
    os.chmod(path, 0o700)
    return path
