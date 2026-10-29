"""Private JSON-lines bridge for the same-computer web preview.

The caller supplies a server-owned home, never a path or account number from HTTP.
Tokens/registrations stay in that home; this module never opens a browser itself.
The SDK owns PKCE/state/callback checks. Hosted OAuth needs a different adapter.
"""

import argparse
import json
from pathlib import Path
import secrets
import sys
from urllib.parse import urlsplit

from .__main__ import save_private
from .core import ProbeError, account_alias, field, records, text
from .oauth import (ISSUER, ensure_private_home, quiet_sdk_logs, sessions, validate_scopes)
from .reader import SdkReader


def emit(value):
    print(json.dumps(value), flush=True)


def account_choices(session, home):
    values = records(SdkReader(session).read("accounts"))
    values = [row for row in values if text(field(row, "account_type")) in {"STANDARD", "GLOBAL"}]
    path = home / "account-choices.json"
    previous = json.loads(path.read_text()) if path.exists() else []
    ids = {row["account"]: row["id"] for row in previous}
    choices = []
    for row in values:
        account = text(field(row, "account"))
        if not account:
            raise ProbeError("INVALID_ACCOUNT", "No account identifier returned.")
        choices.append({"id": ids.get(account) or secrets.token_hex(16), "account": account,
                        "label": account_alias(account), "type": text(field(row, "account_type"))})
    save_private(choices, path)
    # Full account identifiers never leave the private bridge store.
    return [{key: row[key] for key in ("id", "label", "type")} for row in choices]


def public_status(session):
    token = session.status()
    if token is None:
        return {"authorized": False}
    validate_scopes(token)
    return {"authorized": token.remaining_millis() > 0, "expiresAtMs": token.expires_at}


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["login", "status", "accounts"])
    parser.add_argument("home", type=Path)
    args = parser.parse_args(argv)
    from importlib.metadata import version
    if version("tigeropen") != "3.8.0":
        raise ProbeError("SDK_VERSION", "The tested Tiger SDK is required.")
    if not args.home.is_absolute():
        raise ProbeError("AUTH_STORAGE", "A server-owned absolute home is required.")
    quiet_sdk_logs()
    session = sessions(args.home)
    if args.command == "status":
        emit({"event": "status", **public_status(session)})
        return
    ensure_private_home(args.home)
    if args.command == "login":
        def show(url):
            parsed = urlsplit(url)
            if parsed.scheme != "https" or parsed.netloc != urlsplit(ISSUER).netloc:
                raise ProbeError("AUTH_ENDPOINT", "Unexpected Tiger authorization endpoint.")
            emit({"event": "authorize", "url": url})
        token = session.login_if_needed(show)
        validate_scopes(token)
    elif not public_status(session)["authorized"]:
        raise ProbeError("AUTH_REQUIRED", "Reconnect Tiger to continue.")
    emit({"event": "accounts", **public_status(session), "accounts": account_choices(session, args.home)})


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Do not log SDK error strings, HTTP bodies, credentials or account numbers.
        emit({"event": "error", "code": "TIGER_CONNECTION_FAILED"})
        sys.exit(1)
