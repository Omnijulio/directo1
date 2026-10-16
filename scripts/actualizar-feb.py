#!/usr/bin/env python3
"""Renueva el acceso público de lectura FEB y verifica la ficha del partido.

El token procede del HTML público de FEB, dura aproximadamente 24 horas y
solo se utiliza para consultar la misma API que utiliza su página oficial.
Nunca se escribe en los logs.
"""
import base64
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


class GamePage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.token = None
        self.values = {}
        self.results = []
        self.capture = None
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "input" and attrs.get("id", "").endswith("_token"):
            self.token = attrs.get("value")
        ident = attrs.get("id", "")
        for suffix, key in [("equipoLocalNombre", "home_name"), ("equipoVisitanteNombre", "away_name")]:
            if ident.endswith(suffix):
                self.capture, self.depth = key, 1
                self.values[key] = ""
                return
        if tag == "a":
            for suffix, key in [("equipoLocalHyperLink", "home_id"), ("equipoVisitanteHyperLink", "away_id")]:
                if ident.endswith(suffix):
                    match = re.search(r"[?&]i=(\d+)", attrs.get("href", ""))
                    if match:
                        self.values[key] = match.group(1)
        if tag == "span" and attrs.get("class") == "resultado":
            self.capture, self.depth = "score", 1
            self.values["score"] = ""
            return
        if self.capture:
            self.depth += 1

    def handle_data(self, data):
        if self.capture:
            self.values[self.capture] += data

    def handle_endtag(self, tag):
        if self.capture:
            self.depth -= 1
            if self.depth == 0:
                if self.capture == "score":
                    self.results.append(self.values["score"].strip())
                self.capture = None


def build_bootstrap(html, game, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    parser = GamePage()
    parser.feed(html)
    if not parser.token:
        raise ValueError("La página FEB no contiene su token público")
    payload = parser.token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    expires = dt.datetime.fromtimestamp(claims["exp"], dt.timezone.utc)
    if expires <= now + dt.timedelta(minutes=20):
        raise ValueError("El token recibido caduca demasiado pronto")
    values = parser.values
    if values.get("home_id") != str(game["local"]["id"]) or values.get("away_id") != str(game["visitante"]["id"]):
        raise ValueError("La ficha FEB no coincide con los equipos configurados")
    scores = parser.results
    if len(scores) < 2 or any(not re.fullmatch(r"\d{1,3}", value) for value in scores[:2]):
        raise ValueError("La ficha FEB no contiene un marcador válido")
    start = dt.datetime.fromisoformat(game["inicio"])
    return {
        "partido": game["partido"], "fuente": game["fuente"],
        "consultado": now.isoformat(), "caduca": expires.isoformat(),
        "tokenPublico": parser.token,
        "ficha": {
            "partido": game["partido"], "previa": now < start and scores[:2] == ["0", "0"],
            "local": {"id": values["home_id"], "nombre": values["home_name"].strip(), "puntos": int(scores[0])},
            "visitante": {"id": values["away_id"], "nombre": values["away_name"].strip(), "puntos": int(scores[1])}
        }
    }


def refresh_game(game):
    # Se construye la URL desde el ID: no se admiten destinos arbitrarios.
    game_id = str(game["partido"])
    if not re.fullmatch(r"\d{1,10}", game_id):
        raise ValueError("ID de partido no válido")
    req = urllib.request.Request("https://baloncestoenvivo.feb.es/Partido.aspx?p=" + game_id,
                                 headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as response:
        html = response.read().decode("utf-8")
    data = build_bootstrap(html, game)
    folder = ROOT / "datos"
    folder.mkdir(exist_ok=True)
    filename = game.get("bootstrap", "datos/feb-bootstrap.json")
    if not re.fullmatch(r"datos/feb-(?:bootstrap|\d{1,10})\.json", filename):
        raise ValueError("Archivo de acceso FEB no válido")
    target = ROOT / filename
    temp = target.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temp.replace(target)
    print("Ficha FEB verificada. Partido", game_id, "·", data["ficha"]["local"]["puntos"],
          "–", data["ficha"]["visitante"]["puntos"], "· acceso público actualizado.")


def main():
    config = json.loads((ROOT / "config-baloncesto.json").read_text())
    refresh_game(config["feb"])
    for game in config.get("pruebas", []):
        try:
            refresh_game(game)
        except Exception as error:
            # Un partido de prueba no impide renovar el acceso de la emisión.
            print("No se ha renovado la prueba", game.get("partido"), "·", type(error).__name__)


if __name__ == "__main__":
    main()
