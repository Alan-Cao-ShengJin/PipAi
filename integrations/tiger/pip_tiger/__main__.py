"""Local commands; no web route, LLM integration, order operation or implicit login."""

import argparse
from importlib.metadata import version
import json
import os
from pathlib import Path
import sys
import tempfile
from urllib.parse import urlsplit
import webbrowser

from .core import ProbeError

ROOT = Path(__file__).resolve().parents[3]


def save_private(report, destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    descriptor, temporary = tempfile.mkstemp(prefix=".probe-", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as out:
            json.dump(report, out, indent=2, allow_nan=False)
            out.write("\n")
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def summary(report):
    result = {key: report[key] for key in ("broker", "dataMode", "status")}
    if "account" in report:
        result["account"] = report["account"]
        result["capabilities"] = {key: value["status"] for key, value in report["capabilities"].items()}
        result["monitoringActive"] = False
        result["executionAvailable"] = False
    else:
        result.update({key: report[key] for key in ("accounts", "message") if key in report})
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description="Pip Tiger read-only access spike")
    parser.add_argument("command", choices=["status", "login", "probe", "demo"])
    parser.add_argument("--contract", action="append", default=[], help="Exact broker research identifier; may be repeated (max 10).")
    parser.add_argument("--exchange", action="append", default=[], help="Discover contracts for a broker-verified exchange (max 2).")
    parser.add_argument("--account-suffix", help="Last four characters of one authorized live account.")
    parser.add_argument("--quotes", action="store_true", help="Also test entitled quotes; does not claim device permissions.")
    parser.add_argument("--no-browser", action="store_true", help="Print the login URL for manual opening.")
    args = parser.parse_args(argv)
    if version("tigeropen") != "3.8.0":
        raise ProbeError("SDK_VERSION", "Run npm run tiger:setup to install the tested SDK version.")
    if args.command in {"status", "login"} and (args.contract or args.exchange or args.account_suffix or args.quotes):
        parser.error("Read options apply only to probe or demo.")
    from .oauth import ISSUER, ensure_private_home, quiet_sdk_logs, sessions, validate_scopes
    quiet_sdk_logs()
    if args.command == "demo":
        from .fixtures import FixtureReader
        from .probe import collect
        reader = FixtureReader()
        report = collect(reader, queries=args.contract or ["BZmain"], exchanges=args.exchange,
                         suffix=args.account_suffix, quotes=args.quotes, data_mode="synthetic", clock_ms=1793102400000)
        destination = ROOT / ".data/tiger/demo-report.json"
    else:
        session = sessions()
        if args.command == "status":
            token = session.status()  # Local metadata only. Does not refresh or open a browser.
            if token is None:
                print(json.dumps({"authorized": False, "next": "Enable Tiger OpenAPI in Developer Center, then run npm run tiger:login."}, indent=2))
            else:
                scopes = validate_scopes(token)
                print(json.dumps({"authorized": token.remaining_millis() > 0, "scopes": sorted(scopes),
                                  "expiresAtMs": token.expires_at, "hasRefreshToken": token.has_refresh_token()}, indent=2))
            return 0
        if args.command == "login":
            ensure_private_home()

            def show(url):
                parsed = urlsplit(url)
                if parsed.scheme != "https" or parsed.netloc != urlsplit(ISSUER).netloc:
                    raise ProbeError("AUTH_ENDPOINT", "The authorization endpoint changed; inspect the integration.")
                print("Authorize only the intended accounts and read/query permissions in Tiger.", flush=True)
                print(url, flush=True)
                if not args.no_browser:
                    webbrowser.open(url)

            token = session.login_if_needed(show)
            validate_scopes(token)
            print("Read-only authorization saved locally. No account data or orders were requested.")
            return 0
        if session.status() is None:
            raise ProbeError("AUTH_REQUIRED", "Enable Tiger OpenAPI, then run npm run tiger:login locally.")
        from .probe import collect
        from .reader import SdkReader
        watchlist = json.loads((ROOT / "config/tiger-watchlist.json").read_text())
        queries = args.contract or [row["identifier"] for row in watchlist["references"] if row["identifier"]]
        report = collect(SdkReader(session), queries=queries, exchanges=args.exchange,
                         suffix=args.account_suffix, quotes=args.quotes)
        destination = ROOT / ".data/tiger/latest-probe.json"
    save_private(report, destination)
    output = summary(report)
    output["report"] = str(destination.relative_to(ROOT))
    print(json.dumps(output, indent=2, allow_nan=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ProbeError as error:
        print(json.dumps({"error": error.code, "message": str(error)}), file=sys.stderr)
        raise SystemExit(2)
    except KeyboardInterrupt:
        print("Tiger operation cancelled.", file=sys.stderr)
        raise SystemExit(130)
    except Exception:
        # Never print broker/SDK exception messages, tokens, request bodies or tracebacks.
        print(json.dumps({"error": "TIGER_UNAVAILABLE", "message": "The operation could not be verified. Check local authorization/account entitlements; no order was sent."}), file=sys.stderr)
        raise SystemExit(1)
