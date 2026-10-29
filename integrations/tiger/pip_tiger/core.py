"""Normalize selected SDK fields without inferring prices, permissions or missing balances."""

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from enum import Enum
import re


class ProbeError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def field(value, key, default=None):
    return value.get(key, default) if isinstance(value, dict) else getattr(value, key, default)


def text(value):
    if isinstance(value, Enum):
        value = value.value
    return None if value is None else str(value)


def number(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        result = Decimal(str(value))
        return format(result, "f") if result.is_finite() else None
    except (InvalidOperation, ValueError):
        return None


def positive(value):
    result = number(value)
    return result if result is not None and Decimal(result) > 0 else None


def epoch_ms(value):
    """Only parse documented millisecond timestamps; never substitute receipt time."""
    result = number(value)
    if result is None:
        return None
    parsed = Decimal(result)
    if parsed != parsed.to_integral_value() or not 946684800000 <= parsed <= 4102444800000:
        return None
    return int(parsed)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def records(value):
    if value is None:
        raise ProbeError("MISSING_RESPONSE", "The broker did not return a usable response.")
    if isinstance(value, list):
        result = value
    elif hasattr(value, "columns") and hasattr(value, "to_dict"):
        result = value.to_dict(orient="records")
    else:
        raise ProbeError("INVALID_RESPONSE", "The broker returned an unexpected record collection.")
    if len(result) > 2000:
        raise ProbeError("RESPONSE_LIMIT", "This read exceeds the bounded probe's record limit.")
    return result


def ensure_account(value, expected):
    observed = field(value, "account")
    if observed is not None and str(observed) != str(expected):
        raise ProbeError("ACCOUNT_MISMATCH", "The response does not match the selected account.")


def account_alias(account):
    return "account-" + str(account)[-4:]


def normalize_assets(value, account):
    if value is None:
        raise ProbeError("MISSING_RESPONSE", "No account asset response was returned.")
    ensure_account(value, account)
    segments = field(value, "segments")
    if not isinstance(segments, dict):
        raise ProbeError("MISSING_SEGMENTS", "The futures/securities account segments are unavailable.")
    result = {"sourceTimeMs": epoch_ms(field(value, "update_timestamp")), "segments": {}}
    fields = ["net_liquidation", "cash_balance", "cash_available_for_trade", "init_margin",
              "maintain_margin", "overnight_margin", "excess_liquidation", "overnight_liquidation",
              "unrealized_pl", "realized_pl", "buying_power"]
    for key in ("S", "C"):
        segment = segments.get(key)
        if segment is None:
            result["segments"][key] = None
            continue
        result["segments"][key] = {
            "currency": text(field(segment, "currency")),
            **{name: number(field(segment, name)) for name in fields},
        }
    result["futuresSegmentAvailable"] = result["segments"]["C"] is not None
    return result


def normalize_positions(value, account):
    result = []
    for row in records(value):
        ensure_account(row, account)
        contract = field(row, "contract")
        quantity = number(field(row, "position_qty"))
        # Legacy scaled quantity is retained as evidence, not guessed into actual contracts.
        if field(row, "position_scale") not in (None, 0) and field(row, "position_qty") == field(row, "quantity"):
            quantity = None
        result.append({
            "symbol": text(field(contract, "symbol")),
            "identifier": text(field(contract, "identifier")),
            "securityType": text(field(contract, "sec_type")),
            "exchange": text(field(contract, "exchange")),
            "currency": text(field(contract, "currency")),
            "expiry": text(field(contract, "expiry")),
            "quantity": quantity,
            "quantityUnresolved": quantity is None,
            "legacyQuantity": number(field(row, "quantity")),
            "legacyScale": number(field(row, "position_scale")),
            "multiplier": positive(field(contract, "multiplier")),
            "averageCost": number(field(row, "average_cost")),
            "marketPrice": number(field(row, "market_price")),
            "unrealizedPnl": number(field(row, "unrealized_pnl")),
            "realizedPnl": number(field(row, "realized_pnl")),
            "priceFreshness": "unverified",  # Position responses do not establish a quote timestamp.
        })
    return result


def normalize_orders(value, account):
    result = []
    for row in records(value):
        ensure_account(row, account)
        contract = field(row, "contract")
        result.append({
            "id": text(field(row, "id")), "symbol": text(field(contract, "symbol")),
            "securityType": text(field(contract, "sec_type")), "exchange": text(field(contract, "exchange")),
            "action": text(field(row, "action")), "status": text(field(row, "status")),
            "quantity": number(field(row, "quantity")), "filled": number(field(row, "filled")),
            "orderType": text(field(row, "order_type")), "limitPrice": number(field(row, "limit_price")),
        })
    return result


def normalize_transactions(value, account):
    result = []
    for row in records(value):
        ensure_account(row, account)
        # A probe is bounded, not a full execution-history reconciliation.
        contract = field(row, "contract")
        result.append({"orderId": text(field(row, "order_id")), "transactionId": text(field(row, "id")),
                       "symbol": text(field(contract, "symbol")), "securityType": text(field(contract, "sec_type")),
                       "action": text(field(row, "action")), "filledQuantity": number(field(row, "filled_quantity")),
                       "filledQuantityScale": number(field(row, "filled_quantity_scale")),
                       "filledPrice": number(field(row, "filled_price")), "filledAmount": number(field(row, "filled_amount")),
                       "transactedAt": text(field(row, "transacted_at"))})
    return result


def normalize_contracts(value):
    result = []
    for row in records(value):
        code = text(field(row, "contract_code"))
        month = text(field(row, "contract_month"))
        continuous = field(row, "continuous")
        # Some SDK examples label a 'main' code continuous=False: suffix/month checks still apply.
        reference = bool(code and code.lower().endswith("main")) or continuous is not False or not bool(month and re.fullmatch(r"\d{6}", month))
        result.append({
            "code": code, "symbol": text(field(row, "symbol")), "name": text(field(row, "name")),
            "exchange": text(field(row, "exchange")), "exchangeCode": text(field(row, "exchange_code")),
            "currency": text(field(row, "currency")), "contractMonth": month,
            "multiplier": positive(field(row, "multiplier")), "minimumTick": positive(field(row, "min_tick")),
            "firstNoticeDate": text(field(row, "first_notice_date")),
            "lastTradingDate": text(field(row, "last_trading_date")),
            "deliveryMode": text(field(row, "delivery_mode")),
            "referenceOnly": reference, "executionSupported": False,
        })
    return result


def normalize_quotes(value, received_ms):
    result = []
    for row in records(value):
        source_ms = epoch_ms(field(row, "latest_time"))
        age = received_ms - source_ms if source_ms is not None else None
        result.append({
            "identifier": text(field(row, "identifier")),
            "bid": number(field(row, "bid_price")), "ask": number(field(row, "ask_price")),
            "last": number(field(row, "latest_price")), "sourceTimeMs": source_ms,
            "ageMs": age,
            "timestampState": "missing" if age is None else "future" if age < -1000 else "stale" if age > 30000 else "recent",
            "delayEntitlement": "unverified",  # A successful quote does not establish real-time rights.
        })
    return result
