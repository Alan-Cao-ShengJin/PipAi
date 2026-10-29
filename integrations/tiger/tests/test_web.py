import json
from pathlib import Path
import stat
import tempfile
from types import SimpleNamespace as Obj
import unittest
from unittest.mock import patch

from pip_tiger.web import account_choices, public_status
from pip_tiger.oauth import sessions


class WebBridgeTests(unittest.TestCase):
    def test_browser_store_does_not_fall_back_to_founder_credentials(self):
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            for path in [first, second]:
                session = sessions(Path(path))
                self.assertIsNone(session.status())

    def test_account_identifiers_are_private_stable_and_separated(self):
        rows = [Obj(account="PRIVATE_ACCOUNT_1234", account_type="STANDARD"),
                Obj(account="PRIVATE_OTHER_1234", account_type="GLOBAL"),
                Obj(account="PAPER_5678", account_type="PAPER")]
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            with patch("pip_tiger.web.SdkReader") as reader:
                reader.return_value.read.return_value = rows
                a = account_choices(None, Path(first))
                repeated = account_choices(None, Path(first))
                b = account_choices(None, Path(second))
            self.assertEqual(a, repeated)
            self.assertNotEqual(a[0]["id"], a[1]["id"])
            self.assertNotEqual(a[0]["id"], b[0]["id"])
            self.assertEqual(len(a), 2)
            self.assertNotIn("PRIVATE", json.dumps(a))
            self.assertEqual(a[0]["label"], "account-1234")
            path = Path(first) / "account-choices.json"
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_status_without_auth_does_not_refresh_or_read_accounts(self):
        session = Obj(status=lambda: None)
        with patch("pip_tiger.web.SdkReader", side_effect=AssertionError("No network expected")):
            self.assertEqual(public_status(session), {"authorized": False})


if __name__ == "__main__":
    unittest.main()
