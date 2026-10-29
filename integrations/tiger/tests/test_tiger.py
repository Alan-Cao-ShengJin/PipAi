import json
import os
from pathlib import Path
import stat
import tempfile
import time
from types import SimpleNamespace as Obj
import unittest
from unittest.mock import patch, Mock

from tigeropen.auth.authentication import RequestAuthContext
from tigeropen.auth.oauth2.token import OAuth2Token
from tigeropen.common.request import OpenApiRequest
from tigeropen.tiger_open_client import TigerOpenClient
from tigeropen.trade.domain.contract import Contract
from tigeropen.trade.domain.order import Transaction
from tigeropen.trade.domain.position import Position
from tigeropen.trade.domain.prime_account import PortfolioAccount, Segment
from tigeropen.quote.quote_client import QuoteClient

from pip_tiger.core import (ProbeError, epoch_ms, normalize_assets, normalize_contracts,
                            normalize_positions, normalize_quotes, normalize_transactions, number, records)
from pip_tiger.fixtures import FixtureReader
from pip_tiger.oauth import (ISSUER, READ_METHODS, READ_SCOPES, ReadOnlyAuthentication,
                             ReadOnlySession, client_config, validate_scopes)
from pip_tiger.probe import collect
from pip_tiger.reader import SdkReader
from pip_tiger.__main__ import save_private, summary


def token(scope=None):
    return OAuth2Token(issuer=ISSUER, client_id="fixture-client", access_token="NEVER_PRINT_FIXTURE_TOKEN",
                       expires_at=int(time.time() * 1000) + 3600000,
                       scope=" ".join(sorted(READ_SCOPES)) if scope is None else scope)


class OfflineTest(unittest.TestCase):
    def setUp(self):
        # Every test forbids real network access, including SDK initialization side effects.
        for target in ["tigeropen.tiger_open_client.do_post", "urllib3.PoolManager.request"]:
            guard = patch(target, side_effect=AssertionError("Network access forbidden in this test"))
            guard.start()
            self.addCleanup(guard.stop)


class NormalizationTests(OfflineTest):
    def test_unknown_numeric_values_are_not_zero_or_json_nan(self):
        for value in [None, True, "bad", float("inf"), float("nan")]:
            self.assertIsNone(number(value))
        self.assertEqual(number(0), "0")
        self.assertEqual(number(-2), "-2")
        self.assertEqual(number("0.00001"), "0.00001")

    def test_futures_segment_does_not_use_consolidated_securities_balance(self):
        account = PortfolioAccount("SIM1", 1793102399000)
        securities = Segment(); securities.category = "S"; securities.net_liquidation = 900000
        account.add_segment(securities)
        result = normalize_assets(account, "SIM1")
        self.assertFalse(result["futuresSegmentAvailable"])
        self.assertIsNone(result["segments"]["C"])
        futures = Segment(); futures.category = "C"; futures.net_liquidation = 10000; futures.currency = "USD"
        account.add_segment(futures)
        result = normalize_assets(account, "SIM1")
        self.assertEqual(result["segments"]["C"]["net_liquidation"], "10000")
        self.assertIsNone(result["segments"]["C"]["maintain_margin"])

    def test_wrong_account_is_rejected(self):
        with self.assertRaises(ProbeError):
            normalize_assets(PortfolioAccount("OTHER"), "SIM1")
        with self.assertRaises(ProbeError):
            normalize_positions([Position("OTHER", Contract("SIM"))], "SIM1")

    def test_signed_actual_quantity_and_multiplier_from_real_sdk_models(self):
        position = Position("SIM1", Contract("SIM_GOLD", sec_type="FUT", multiplier=10, currency="USD"),
                            quantity=-2, position_qty=-2, market_price=0)
        row = normalize_positions([position], "SIM1")[0]
        self.assertEqual(row["quantity"], "-2")
        self.assertEqual(row["multiplier"], "10")
        self.assertEqual(row["marketPrice"], "0")
        self.assertEqual(row["priceFreshness"], "unverified")

    def test_actual_zero_quantity_is_not_replaced_by_legacy_quantity(self):
        position = Position("SIM1", Contract("SIM"), quantity=1000, position_qty=0, position_scale=3)
        self.assertEqual(normalize_positions([position], "SIM1")[0]["quantity"], "0")

    def test_ambiguous_legacy_scaled_quantity_is_unresolved(self):
        position = Position("SIM1", Contract("SIM"), quantity=1000, position_scale=3)
        row = normalize_positions([position], "SIM1")[0]
        self.assertIsNone(row["quantity"])
        self.assertTrue(row["quantityUnresolved"])
        self.assertEqual(row["legacyQuantity"], "1000")

    def test_main_reference_stays_reference_even_if_provider_flag_is_false(self):
        rows = normalize_contracts([{"contract_code": "BZmain", "contract_month": "", "continuous": False}])
        self.assertTrue(rows[0]["referenceOnly"])
        self.assertFalse(rows[0]["executionSupported"])
        self.assertIsNone(rows[0]["multiplier"])

    def test_dated_contract_does_not_enable_execution(self):
        row = normalize_contracts([{"contract_code": "SIM2612", "contract_month": "202612", "continuous": False}])[0]
        self.assertFalse(row["referenceOnly"])
        self.assertFalse(row["executionSupported"])

    def test_quote_time_keeps_missing_stale_future_and_entitlement_distinct(self):
        now = 1793102400000
        rows = normalize_quotes([{"latest_time": None}, {"latest_time": now - 60000},
                                 {"latest_time": now + 10000}, {"latest_time": now - 1000}], now)
        self.assertEqual([r["timestampState"] for r in rows], ["missing", "stale", "future", "recent"])
        self.assertTrue(all(r["delayEntitlement"] == "unverified" for r in rows))
        self.assertIsNone(epoch_ms(now // 1000))

    def test_sdk_transaction_fields_come_from_contract_and_fill_record(self):
        tx = Transaction(account="SIM1", order_id=7, contract=Contract("SIM2612", sec_type="FUT"),
                         id_=9, action="SELL", filled_quantity=2, filled_price="100.25")
        result = normalize_transactions([tx], "SIM1")[0]
        self.assertEqual(result["symbol"], "SIM2612")
        self.assertEqual(result["filledQuantity"], "2")
        self.assertEqual(result["filledPrice"], "100.25")

    def test_no_response_is_not_an_empty_position_list(self):
        with self.assertRaises(ProbeError):
            records(None)
        self.assertEqual(records([]), [])


class ReadOnlyBoundaryTests(OfflineTest):
    def test_requested_scopes_exclude_write_even_when_server_advertises_it(self):
        with tempfile.TemporaryDirectory() as home:
            session = ReadOnlySession(issuer=ISSUER, home=home, client_id="fixture")
            session._metadata = Obj(scopes_supported=[*READ_SCOPES, "api.trade:write"])
            self.assertEqual(set(session.scopes.split()), READ_SCOPES)
            session._metadata = Obj(scopes_supported=["api.basic:read"])
            with self.assertRaises(ProbeError):
                _ = session.scopes

    def test_broader_or_unknown_grants_are_rejected_before_storage(self):
        with tempfile.TemporaryDirectory() as home:
            session = ReadOnlySession(issuer=ISSUER, home=home, client_id="fixture")
            for scopes in ["api.account:read api.trade:write", "*", "api.unrecognized:read", ""]:
                with self.assertRaises(ProbeError):
                    validate_scopes(token(scopes))
            with self.assertRaises(ProbeError):
                session._to_token({"access_token": "fixture", "expires_in": 3600, "scope": "api.trade:write"}, "api.account:read", "fixture")
            self.assertFalse(list(Path(home).rglob("*.json")))

    def test_method_guard_blocks_order_and_transfer_before_token_lookup(self):
        session = Mock()
        auth = ReadOnlyAuthentication(session)
        for method in ["place_order", "modify_order", "cancel_order", "transfer_fund", "grab_quote_permission", "unknown"]:
            with self.assertRaises(ProbeError):
                auth.apply(RequestAuthContext({"method": method}))
        session.get_access_token.assert_not_called()
        session.status.assert_not_called()

    def test_real_sdk_request_cannot_bypass_method_guard(self):
        session = Obj(status=lambda: token(), get_access_token=lambda: "fixture")
        client = TigerOpenClient(client_config(session), logger=Mock())
        with self.assertRaises(ProbeError) as error:
            client.execute(OpenApiRequest("place_order"))
        self.assertEqual(error.exception.code, "METHOD_DENIED")

    def test_read_auth_sets_header_without_printing_token(self):
        session = Obj(status=lambda: token(), get_access_token=lambda: "fixture")
        context = RequestAuthContext({"method": "positions"})
        attempt = ReadOnlyAuthentication(session).apply(context)
        self.assertEqual(context.authorization_header, "Bearer fixture")
        self.assertNotIn("fixture", repr(attempt))

    def test_signature_and_endpoint_environment_do_not_leak_into_oauth_config(self):
        with patch.dict(os.environ, {"TIGEROPEN_PRIVATE_KEY": "BAD_KEY", "TIGEROPEN_SERVER_URL": "https://untrusted.example"}):
            config = client_config(Mock())
        self.assertEqual(config.private_key, "")
        self.assertEqual(config.server_url, "https://openapi.tigerfintech.com/gateway")
        self.assertFalse(config.enable_dynamic_domain)
        self.assertEqual(config.retry_max_tries, 0)

    def test_quote_constructor_does_not_claim_device_permission(self):
        session = Obj(status=lambda: token(), get_access_token=lambda: "fixture")
        reader = SdkReader(session)
        with patch.object(QuoteClient, "grab_quote_permission", side_effect=AssertionError("Must not claim permission")):
            self.assertIsInstance(reader.quote, QuoteClient)
        with self.assertRaises(ProbeError):
            reader.read("place_order")

    def test_missing_auth_does_not_open_browser_or_dispatch(self):
        with self.assertRaises(ProbeError) as error:
            SdkReader(Obj(status=lambda: None))
        self.assertEqual(error.exception.code, "AUTH_REQUIRED")

    def test_pinned_method_names_cover_selected_actual_sdk_reads(self):
        expected = {"future_exchange", "future_contract_by_exchange_code", "prime_assets", "active_orders", "order_transactions"}
        self.assertTrue(expected.issubset(READ_METHODS))


class ProbeTests(OfflineTest):
    def test_fixture_probe_keeps_mode_health_and_reference_limits_visible(self):
        reader = FixtureReader()
        report = collect(reader, queries=["BZmain"], exchanges=["SIM_EXCHANGE"], quotes=True,
                         data_mode="synthetic", clock_ms=1793102400000)
        self.assertFalse(report["monitoringActive"])
        self.assertFalse(report["executionAvailable"])
        self.assertEqual(report["dataMode"], "synthetic")
        self.assertTrue(report["data"]["contract:BZmain"][0]["referenceOnly"])
        self.assertEqual(report["data"]["positions:FUT"][0]["quantity"], "-2")
        self.assertNotIn("SIM000001", json.dumps(report))
        self.assertNotIn("net_liquidation", json.dumps(summary(report)))

    def test_failed_read_is_not_reported_as_zero_exposure_and_errors_are_redacted(self):
        reader = FixtureReader(); original = reader.read
        def read(operation, **args):
            if operation == "positions" and args["security_type"] == "FUT":
                raise RuntimeError("SECRET_ACCOUNT_AND_TOKEN")
            return original(operation, **args)
        reader.read = read
        report = collect(reader, queries=[])
        self.assertNotIn("positions:FUT", report["data"])
        self.assertEqual(report["capabilities"]["positions:FUT"]["status"], "unavailable")
        self.assertNotIn("SECRET_ACCOUNT_AND_TOKEN", json.dumps(report))

    def test_multiple_accounts_require_selection_before_reading_holdings(self):
        reader = FixtureReader(); original = reader.read
        def read(operation, **args):
            if operation == "accounts":
                return [Obj(account="SIM000001", account_type="STANDARD"), Obj(account="SIM000002", account_type="STANDARD")]
            return original(operation, **args)
        reader.read = read
        self.assertEqual(collect(reader, queries=[])["status"], "account-selection-required")
        report = collect(reader, queries=[], suffix="0001")
        self.assertEqual(report["account"]["alias"], "account-0001")

    def test_paper_account_never_becomes_a_real_account_snapshot(self):
        reader = FixtureReader(); original = reader.read
        reader.read = lambda op, **args: [Obj(account="PAPER1", account_type="PAPER")] if op == "accounts" else original(op, **args)
        result = collect(reader, queries=[])
        self.assertNotIn("data", result)

    def test_only_broker_discovered_exchanges_can_be_queried(self):
        reader = FixtureReader()
        result = collect(reader, queries=[], exchanges=["UNVERIFIED"])
        self.assertFalse(any(op == "contracts" for op, _ in reader.calls))
        self.assertEqual(result["capabilities"]["contracts:UNVERIFIED"]["code"], "EXCHANGE_NOT_VERIFIED")

    def test_empty_or_different_contract_is_not_a_verified_mapping(self):
        for response in [[], [{"contract_code": "DIFFERENT", "continuous": False}]]:
            reader = FixtureReader(); original = reader.read
            reader.read = lambda op, **args: response if op == "contract" else original(op, **args)
            result = collect(reader, queries=["BZmain"])
            self.assertNotIn("contract:BZmain", result["data"])
            self.assertEqual(result["capabilities"]["contract:BZmain"]["code"], "CONTRACT_NOT_RETURNED")

    def test_quote_for_different_instrument_is_not_used(self):
        reader = FixtureReader(); original = reader.read
        reader.read = lambda op, **args: [{"identifier": "WRONG", "latest_price": 1}] if op == "quotes" else original(op, **args)
        result = collect(reader, queries=["BZmain"], quotes=True)
        self.assertNotIn("quotes", result["data"])
        self.assertEqual(result["capabilities"]["quotes"]["code"], "QUOTE_IDENTIFIER_MISMATCH")

    def test_input_limits_stop_before_account_queries(self):
        reader = FixtureReader()
        for queries in [["https://untrusted.example"], ["C" + str(n) for n in range(11)]]:
            with self.assertRaises(ProbeError):
                collect(reader, queries=queries)
        self.assertEqual(reader.calls, [])

    def test_transaction_pagination_is_reported_instead_of_claiming_completeness(self):
        reader = FixtureReader(); original = reader.read
        reader.read = lambda op, **args: Obj(result=[], next_page_token="NEXT_PAGE") if op == "transactions" else original(op, **args)
        report = collect(reader, queries=[])
        self.assertTrue(report["data"]["transactions:FUT"]["moreAvailable"])

    def test_saved_report_is_private_and_replaces_atomically(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "private/report.json"
            save_private({"dataMode": "synthetic"}, path)
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            save_private({"dataMode": "live-read-only"}, path)
            self.assertEqual(json.loads(path.read_text())["dataMode"], "live-read-only")
            self.assertEqual(len(list(path.parent.iterdir())), 1)


if __name__ == "__main__":
    unittest.main()
