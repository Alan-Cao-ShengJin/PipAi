"""Explicit read operations only. The SDK transport is additionally guarded by OAuth policy."""

import logging

from tigeropen.quote.quote_client import QuoteClient
from tigeropen.trade.trade_client import TradeClient

from .core import ProbeError
from .oauth import client_config, validate_scopes

OPERATIONS = frozenset({"accounts", "assets", "positions", "orders", "transactions", "permissions", "exchanges", "contracts", "contract", "quotes"})


class SdkReader:
    def __init__(self, session):
        token = session.status()
        if token is None:
            raise ProbeError("AUTH_REQUIRED", "Enable Tiger OpenAPI, then run npm run tiger:login locally.")
        validate_scopes(token)
        self.config = client_config(session)
        self.logger = logging.getLogger("pip.tiger.sdk")
        self.trade = TradeClient(self.config, logger=self.logger)
        self._quote = None

    @property
    def quote(self):
        if self._quote is None:
            self._quote = QuoteClient(self.config, logger=self.logger, is_grab_permission=False)
        return self._quote

    def read(self, operation, **args):
        if operation not in OPERATIONS:
            raise ProbeError("METHOD_DENIED", "This probe exposes only named read operations.")
        if operation == "accounts":
            return self.trade.get_managed_accounts()
        if operation == "assets":
            return self.trade.get_prime_assets(account=args["account"], consolidated=False)
        if operation == "positions":
            return self.trade.get_positions(account=args["account"], sec_type=args["security_type"])
        if operation == "orders":
            return self.trade.get_open_orders(account=args["account"], sec_type=args["security_type"])
        if operation == "transactions":
            return self.trade.get_transactions(account=args["account"], sec_type=args["security_type"],
                                               start_time=args["since_ms"], limit=100, page_token="")
        if operation == "permissions":
            return self.quote.get_quote_permission()
        if operation == "exchanges":
            return self.quote.get_future_exchanges()
        if operation == "contracts":
            return self.quote.get_future_contracts(args["exchange"])
        if operation == "contract":
            return self.quote.get_future_contract(args["identifier"])
        return self.quote.get_future_brief(args["identifiers"])
