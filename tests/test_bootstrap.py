import base64
import datetime as dt
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("bootstrap", Path(__file__).resolve().parents[1] / "scripts/actualizar-feb.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BootstrapTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 10, 16, 3, tzinfo=dt.timezone.utc)
        payload = base64.urlsafe_b64encode(json.dumps({"exp": int((self.now + dt.timedelta(hours=24)).timestamp())}).encode()).decode().rstrip("=")
        self.html = f'''<input id="_ctl0_token" value="test.{payload}.test">
        <a id="x_equipoLocalHyperLink" href="Equipo.aspx?i=1008400"><span id="x_equipoLocalNombre">TIZONA</span></a>
        <span class="resultado">0</span>
        <a id="x_equipoVisitanteHyperLink" href="Equipo.aspx?i=1009837"><span id="x_equipoVisitanteNombre">OVIEDO</span></a>
        <span class="resultado">0</span>'''
        self.game = {"partido": 2535753, "fuente": "https://baloncestoenvivo.feb.es/Partido.aspx?p=2535753",
                     "inicio": "2026-10-16T20:45:00+02:00", "local": {"id": "1008400"}, "visitante": {"id": "1009837"}}

    def test_extracts_confirmed_zero(self):
        data = module.build_bootstrap(self.html, self.game, self.now)
        self.assertEqual(data["ficha"]["local"]["puntos"], 0)
        self.assertTrue(data["ficha"]["previa"])
        self.assertEqual(data["ficha"]["visitante"]["nombre"], "OVIEDO")

    def test_no_pregame_score_after_start(self):
        data = module.build_bootstrap(self.html, self.game, self.now + dt.timedelta(hours=18))
        self.assertFalse(data["ficha"]["previa"])

    def test_rejects_wrong_teams_or_missing_score(self):
        with self.assertRaises(ValueError):
            module.build_bootstrap(self.html.replace("1009837", "999"), self.game, self.now)
        with self.assertRaises(ValueError):
            module.build_bootstrap(self.html.replace('class="resultado">0', 'class="resultado">—'), self.game, self.now)


if __name__ == "__main__":
    unittest.main()
