"""Stock Republic: serves the app and proxies price data from Yahoo Finance.

Run:  python3 server.py   then open http://localhost:8000
"""
import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8000
ROOT = Path(__file__).parent
STATIC = {"/", "/index.html", "/logo.svg"}
STATIC_DIRS = ("/css/", "/js/")
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/"
CACHE_SECONDS = 300
_cache = {}

# Bar size that keeps each range readable without thousands of points.
INTERVALS = {"1d": "5m", "5d": "30m", "1mo": "1d", "6mo": "1d", "ytd": "1d",
             "1y": "1d", "5y": "1wk", "max": "1mo"}


def fetch_chart(symbol, rng):
    key = (symbol, rng)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    url = YAHOO + urllib.parse.quote(symbol) + "?" + urllib.parse.urlencode(
        {"range": rng, "interval": INTERVALS.get(rng, "1d")})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = json.load(resp)
    result = (raw.get("chart") or {}).get("result")
    if not result:
        raise ValueError("No data for " + symbol)
    r = result[0]
    meta = r["meta"]
    quote = r["indicators"]["quote"][0]
    points = [[t, c] for t, c in zip(r.get("timestamp") or [], quote.get("close") or []) if c is not None]
    data = {
        "symbol": symbol,
        "name": meta.get("longName") or meta.get("shortName") or symbol,
        "currency": meta.get("currency"),
        "exchange": meta.get("fullExchangeName"),
        "price": meta.get("regularMarketPrice"),
        "dayChangePct": meta.get("regularMarketChangePercent"),
        "high52": meta.get("fiftyTwoWeekHigh"),
        "low52": meta.get("fiftyTwoWeekLow"),
        "dayHigh": meta.get("regularMarketDayHigh"),
        "dayLow": meta.get("regularMarketDayLow"),
        "volume": meta.get("regularMarketVolume"),
        "marketTime": meta.get("regularMarketTime"),
        "points": points,
    }
    _cache[key] = (time.time(), data)
    return data


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        pass

    def send_json(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)
        if url.path == "/api/chart":
            try:
                self.send_json(200, fetch_chart(q["symbol"][0], q.get("range", ["1y"])[0]))
            except Exception as e:
                self.send_json(502, {"error": str(e)})
        elif url.path == "/api/overview":
            # One month of daily closes for many symbols at once, for the cards.
            symbols = [s for s in q.get("symbols", [""])[0].split(",") if s]

            def one(s):
                try:
                    d = fetch_chart(s, "1mo")
                    return s, {k: d[k] for k in ("name", "price", "currency", "dayChangePct", "marketTime", "points")}
                except Exception as e:
                    return s, {"error": str(e)}

            with ThreadPoolExecutor(8) as pool:
                self.send_json(200, dict(pool.map(one, symbols)))
        elif url.path in STATIC or (url.path.startswith(STATIC_DIRS) and ".." not in url.path):
            super().do_GET()
        else:
            self.send_error(404)


if __name__ == "__main__":
    print(f"Stock Republic running at http://localhost:{PORT}  (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
