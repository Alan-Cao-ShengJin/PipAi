"""Fabricated responses for the offline access-probe demo, not contract specifications."""

from types import SimpleNamespace as Obj

from .core import ProbeError


class FixtureReader:
    def __init__(self):
        self.calls = []

    def read(self, operation, **args):
        self.calls.append((operation, args))
        account = "SIM000001"
        if operation == "accounts":
            return [Obj(account=account, account_type="STANDARD")]
        if operation == "assets":
            return Obj(account=account, update_timestamp=1793102399000,
                       segments={"C": Obj(currency="USD", net_liquidation=20000, cash_balance=19000,
                                          init_margin=2000, maintain_margin=1500, excess_liquidation=18000)})
        if operation == "positions":
            if args["security_type"] == "STK":
                return []
            return [Obj(account=account, position_qty=-2, quantity=-2, position_scale=0,
                        contract=Obj(symbol="SIM_GOLD_202612", identifier="SIM_GOLD_202612", sec_type="FUT",
                                     exchange="SIM_EXCHANGE", currency="USD", multiplier=10),
                        average_cost=4000, market_price=3990, unrealized_pnl=200)]
        if operation == "orders":
            return []
        if operation == "transactions":
            return Obj(result=[], next_page_token=None)
        if operation == "permissions":
            return [{"name": "synthetic-example-entitlement", "expire_at": -1}]
        if operation == "exchanges":
            return [{"code": "SIM_EXCHANGE", "name": "Fabricated exchange", "zone": "America/Chicago"}]
        if operation == "contracts":
            return [{"contract_code": "SIM_GOLD_202612", "symbol": "SIM_GOLD", "contract_month": "202612",
                     "continuous": False, "currency": "USD", "exchange": "SIM_EXCHANGE", "multiplier": 10, "min_tick": "0.1"}]
        if operation == "contract":
            return [{"contract_code": args["identifier"], "continuous": False, "contract_month": "",
                     "name": "Synthetic continuous-reference example; not a verified product", "currency": "USD"}]
        if operation == "quotes":
            return [{"identifier": key, "latest_price": 100, "bid_price": "99.9", "ask_price": "100.1",
                     "latest_time": 1793102399000} for key in args["identifiers"]]
        raise ProbeError("METHOD_DENIED", "Unknown fixture operation.")
