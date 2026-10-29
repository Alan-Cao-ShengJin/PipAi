"""Bounded access/shape report; not a reconciled portfolio or an active monitor."""

import re
import time

from .core import (ProbeError, account_alias, field, normalize_assets, normalize_contracts,
                   normalize_orders, normalize_positions, normalize_quotes, normalize_transactions,
                   now_iso, records, text)

IDENTIFIER = re.compile(r"[A-Za-z0-9_.:-]{1,40}")


def checked_identifier(value):
    if not IDENTIFIER.fullmatch(value):
        raise ProbeError("INVALID_IDENTIFIER", "Use a broker identifier, not a description or URL.")
    return value


def collect(reader, *, queries, exchanges=(), suffix=None, quotes=False, data_mode="live-read-only", clock_ms=None):
    received_ms = clock_ms if clock_ms is not None else int(time.time() * 1000)
    if len(queries) > 10 or len(exchanges) > 2:
        raise ProbeError("REQUEST_LIMIT", "The access spike supports at most ten contract queries and two exchanges.")
    queries = list(dict.fromkeys(checked_identifier(value) for value in queries))
    exchanges = list(dict.fromkeys(checked_identifier(value) for value in exchanges))
    accounts = records(reader.read("accounts"))
    accounts = [a for a in accounts if text(field(a, "account_type")) in {"STANDARD", "GLOBAL"}]
    if suffix is not None:
        if not re.fullmatch(r"[A-Za-z0-9]{4}", suffix):
            raise ProbeError("ACCOUNT_SELECTION", "Use exactly the last four characters of a listed account alias.")
        accounts = [a for a in accounts if str(field(a, "account", "")).endswith(suffix)]
    if len(accounts) != 1:
        return {"schemaVersion": 1, "broker": "tiger", "dataMode": data_mode,
                "status": "account-selection-required", "generatedAt": now_iso(),
                "accounts": [{"alias": account_alias(field(a, "account")), "type": text(field(a, "account_type"))} for a in accounts],
                "message": "Select one authorized live account with --account-suffix; paper accounts are excluded."}
    selected = accounts[0]
    account = text(field(selected, "account"))
    if not account:
        raise ProbeError("INVALID_ACCOUNT", "Tiger did not supply an account identifier.")
    report = {"schemaVersion": 1, "broker": "tiger", "dataMode": data_mode,
              "generatedAt": now_iso(), "account": {"alias": account_alias(account), "type": text(field(selected, "account_type"))},
              "status": "access-probe", "executionAvailable": False, "monitoringActive": False,
              "coverage": "bounded sequential reads; not a reconciled portfolio or complete history",
              "capabilities": {}, "data": {},
              "unresolved": ["The founder's gold description has not been mapped to a verified Tiger contract.",
                             "Commercial/AI data rights, streaming, renewals and latency still need verification.",
                             "A recent quote timestamp does not prove real-time entitlement."]}

    def step(name, request, normalize=lambda value: value):
        started = now_iso()
        try:
            value = normalize(request())
            report["data"][name] = value
            report["capabilities"][name] = {"status": "read-succeeded", "startedAt": started, "receivedAt": now_iso()}
            return value
        except Exception as error:
            # SDK messages/tracebacks may contain account, request or authorization details.
            code = error.code if isinstance(error, ProbeError) else "READ_FAILED"
            report["capabilities"][name] = {"status": "unavailable", "code": code, "startedAt": started, "receivedAt": now_iso()}
            return None

    if text(field(selected, "account_type")) == "STANDARD":
        step("assets", lambda: reader.read("assets", account=account), lambda value: normalize_assets(value, account))
    else:
        report["capabilities"]["assets"] = {"status": "not-implemented", "code": "GLOBAL_ACCOUNT_ASSETS"}
    for security_type in ("FUT", "STK"):
        step(f"positions:{security_type}", lambda kind=security_type: reader.read("positions", account=account, security_type=kind),
             lambda value: normalize_positions(value, account))
        step(f"openOrders:{security_type}", lambda kind=security_type: reader.read("orders", account=account, security_type=kind),
             lambda value: normalize_orders(value, account))
        if text(field(selected, "account_type")) == "STANDARD":
            def recent(kind=security_type):
                value = reader.read("transactions", account=account, security_type=kind, since_ms=received_ms - 7 * 86400000)
                if value is None:
                    raise ProbeError("MISSING_RESPONSE", "No transaction response was returned.")
                # Keep pagination visible; this spike never calls a single page complete history.
                return {"items": normalize_transactions(field(value, "result"), account),
                        "moreAvailable": bool(field(value, "next_page_token")), "windowDays": 7, "limit": 100}
            step(f"transactions:{security_type}", recent)
    step("quotePermissions", lambda: reader.read("permissions"),
         lambda value: [{"name": text(field(row, "name")), "expiresAt": text(field(row, "expire_at"))} for row in records(value)])
    exchange_rows = step("exchanges", lambda: reader.read("exchanges"),
                         lambda value: [{k: text(field(row, k)) for k in ("code", "name", "zone")} for row in records(value)])
    available = {row["code"] for row in exchange_rows or []}
    for exchange in exchanges:
        if exchange not in available:
            report["capabilities"][f"contracts:{exchange}"] = {"status": "unavailable", "code": "EXCHANGE_NOT_VERIFIED"}
            continue
        step(f"contracts:{exchange}", lambda key=exchange: reader.read("contracts", exchange=key), normalize_contracts)
    for identifier in queries:
        def exact_contract(key=identifier):
            values = normalize_contracts(reader.read("contract", identifier=key))
            matched = [row for row in values if row["code"] and row["code"].casefold() == key.casefold()]
            if not matched:
                raise ProbeError("CONTRACT_NOT_RETURNED", "The requested contract was not identified in the response.")
            return matched
        step(f"contract:{identifier}", exact_contract)
    if quotes and queries:
        # Freshness is measured at response receipt, not before prior account/network reads.
        def quote_rows():
            values = normalize_quotes(reader.read("quotes", identifiers=queries), int(time.time() * 1000) if clock_ms is None else received_ms)
            identifiers = {key.casefold() for key in queries}
            if not values or any(not row["identifier"] or row["identifier"].casefold() not in identifiers for row in values):
                raise ProbeError("QUOTE_IDENTIFIER_MISMATCH", "The requested quotes were not identified in the response.")
            return {"items": values, "missingIdentifiers": sorted(identifiers - {row["identifier"].casefold() for row in values})}
        step("quotes", quote_rows)
    else:
        report["capabilities"]["quotes"] = {"status": "not-requested"}
    return report
