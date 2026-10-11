import re, json, time, os, sqlite3, threading, unicodedata, difflib
import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify, send_from_directory

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)
db = sqlite3.connect(os.path.join(BASE, "cache.sqlite"), check_same_thread=False)
db.execute("create table if not exists c(k text primary key, t real, v text)")
lock = threading.Lock()
S = requests.Session(); S.headers.update(UA)

def fetch(url, data=None, ttl=7*86400, referer=None):
    k = url + "|" + json.dumps(data, sort_keys=True)
    with lock:
        r = db.execute("select t,v from c where k=?", (k,)).fetchone()
    if r and time.time() - r[0] < ttl:
        return r[1]
    h = {}
    if referer: h["Referer"] = referer
    if data is not None: h["X-Requested-With"] = "XMLHttpRequest"
    for i in range(2):
        resp = S.post(url, data=data, headers=h, timeout=20) if data is not None else S.get(url, headers=h, timeout=20)
        txt = resp.text
        if (resp.status_code == 200 or (resp.status_code == 404 and len(txt) > 20000)) and "Access Denied" not in txt[:3000] and "Just a moment" not in txt[:3000]:
            with lock:
                db.execute("insert or replace into c values(?,?,?)", (k, time.time(), txt)); db.commit()
            return txt
        time.sleep(2)
    raise RuntimeError(f"{url.split('/')[2]} ha bloqueado o fallado la petición (HTTP {resp.status_code})")

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

CHEAP = ["zara", "mercadona", "deliplus", "primark", "lattafa", "armaf", "afnan", "maison alhambra", "french avenue",
         "fragrance world", "rasasi", "paris corner", "al wataniah", "banderas", "equivalenza", "saphir", "lidl", "suddenly",
         "oriflame", "avon", "rayhaan", "swiss arabian", "la rive", "g bellini", "superz", "wild stone", "alexandria fragrances",
         "dua fragrances", "clone"]
def is_cheap(brand):
    b = norm(brand)
    return any(c == b or b.startswith(c) for c in CHEAP)

# ---------- Parfumo ----------
def parfumo_search(q):
    html = fetch("https://www.parfumo.com/s_perfumes_x.php?in=1&filter=" + requests.utils.quote(q), ttl=86400)
    soup = BeautifulSoup(html, "html.parser"); out = []
    for col in soup.select("div.col"):
        a = col.select_one("div.name > a"); b = col.select_one("span.brand > a"); img = col.select_one("div.image img")
        if not a or not b: continue
        lab = col.select_one("div.name .label_a")
        name = a.get_text(" ", strip=True)
        y = col.select_one(".release_year")
        out.append({"name": name, "brand": b.get_text(strip=True), "url": a["href"],
                    "year": y.get_text(strip=True).strip("()") if y else "", "img": img["src"] if img else ""})
    return out

def parfumo_detail(url):
    html = fetch(url); soup = BeautifulSoup(html, "html.parser"); d = {"url": url}
    h1 = soup.select_one("h1"); d["title"] = h1.get_text(" ", strip=True) if h1 else ""
    acc = []
    for h2 in soup.find_all("h2"):
        if h2.get_text(strip=True) == "Main accords":
            acc = [x.get_text(strip=True) for x in h2.find_parent("div").select(".s-circle-container .text-xs")]
            break
    d["accords"] = acc
    pyr = {}
    names = {"nb_t": "salida", "nb_m": "corazon", "nb_b": "fondo", "nb_n": "lineal"}
    for cls, key in names.items():
        for blk in soup.select("div.notes_list div." + cls):
            pyr.setdefault(key, []).extend(s.get_text(" ", strip=True) for s in blk.select("span.clickable_note_img"))
    d["pyramid"] = pyr
    desc = soup.select_one('meta[name="description"]'); d["desc"] = desc["content"] if desc else ""
    m = re.search(r'data-p_id="(\d+)" data-h="([0-9a-f]+)"', html)
    sims = []
    if m:
        try:
            sh = fetch("https://www.parfumo.com/action/perfume/get_similar.php",
                       data={"p_id": m.group(1), "similar_type": "similar", "type": "all", "h": m.group(2)}, referer=url)
            ss = BeautifulSoup(sh, "html.parser")
            for it in ss.select(".sim_item"):
                img = it.select_one("img"); alt = img.get("alt", "") if img else ""
                mm = re.match(r"(.*) by (.*)$", alt)
                bar = it.select_one("[data-percentage]")
                if mm: sims.append({"name": mm.group(1), "brand": mm.group(2).strip(), "pct": bar["data-percentage"] if bar else "", "img": img.get("src", "")})
        except Exception as e:
            d["sim_error"] = str(e)
    d["similar"] = sims
    return d

# ---------- Fragrantica ----------
def fragrantica_find(brand, name):
    slug = re.sub(r"[^A-Za-z0-9]+", "-", unicodedata.normalize("NFKD", brand).encode("ascii", "ignore").decode()).strip("-")
    html = fetch(f"https://www.fragrantica.com/designers/{slug}.html")
    links = sorted(set(re.findall(r'/perfume/[^/"]+/([^"]+?)-(\d+)\.html', html)))
    base = sorted(set(re.findall(r'(/perfume/[^/"]+/)', html)))
    if not links: return None
    t1 = norm(name)
    t2 = norm(re.sub(r"\(\d{4}\)|eau de (toilette|parfum|cologne)|extrait de parfum|\bparfum\b|\bcologne\b", " ", name, flags=re.I))
    best, sc = None, 0
    for s, pid in links:
        n = norm(s.replace("-", " "))
        r = max(difflib.SequenceMatcher(None, t, n).ratio() + (1 if n == t else 0) for t in {t1, t2} if t)
        if n == t1: r += 0.5
        if r > sc: best, sc = (s, pid), r
    if sc < 0.6: return None
    prefix = next((b for b in base if f"{b}{best[0]}-{best[1]}.html" in html), base[0])
    return "https://www.fragrantica.com" + prefix + f"{best[0]}-{best[1]}.html"

def fragrantica_detail(url):
    html = fetch(url); soup = BeautifulSoup(html, "html.parser"); d = {"url": url}
    h1 = soup.select_one('h1[itemprop="name"]'); d["title"] = h1.get_text(" ", strip=True) if h1 else ""
    acc = []
    h6 = soup.find("h6", string=re.compile("main accords"))
    if h6:
        for div in h6.find_parent("div").select("div[style*='width']"):
            sp = div.select_one("span")
            w = re.search(r"width:\s*([\d.]+)%", div.get("style", ""))
            if sp: acc.append({"n": sp.get_text(strip=True), "w": round(float(w.group(1))) if w else None})
    d["accords"] = acc
    m = re.search(r"is an? ([A-Z][A-Za-z ]+?) fragrance for (women and men|women|men)", soup.get_text(" "))
    d["family"] = m.group(1) if m else ""
    d["gender"] = m.group(2) if m else ""
    pyr = {}; key = {"top": "salida", "middle": "corazon", "base": "fondo"}
    for lv in soup.select("pyramid-level-new"):
        k = key.get(lv.get("notes"), "lineal")
        pyr.setdefault(k, []).extend(s.get_text(" ", strip=True) for s in lv.select(".pyramid-note-label"))
    d["pyramid"] = pyr
    r = soup.select_one('[itemprop="ratingValue"]'); d["rating"] = r.get_text(strip=True) if r else ""
    return d

@app.get("/api/search")
def api_search():
    q = request.args.get("q", "").strip()
    if not q: return jsonify(error="Escribe un nombre"), 400
    try:
        res = parfumo_search(q); used = q
        if not res:
            words = [w for w in re.split(r"\s+", q) if len(w) >= 3]
            tries = [" ".join(words[:i]) for i in range(len(words) - 1, 0, -1)] + sorted(words, key=len, reverse=True)
            for t in tries[:5]:
                res = parfumo_search(t)
                if res: used = t; break
        return jsonify(results=res[:15], used=used)
    except Exception as e: return jsonify(error=str(e)), 502

@app.get("/api/perfume")
def api_perfume():
    url = request.args.get("url", ""); brand = request.args.get("brand", ""); name = request.args.get("name", "")
    if not url.startswith("https://www.parfumo.com/Perfumes/"): return jsonify(error="URL no válida"), 400
    out = {"brand": brand, "name": name, "sources": {}}
    try: out["parfumo"] = parfumo_detail(url)
    except Exception as e: out["parfumo_error"] = str(e)
    try:
        fu = fragrantica_find(brand, name)
        if fu: out["fragrantica"] = fragrantica_detail(fu)
        else: out["fragrantica_error"] = "No se ha encontrado en Fragrantica con ese nombre."
    except Exception as e: out["fragrantica_error"] = str(e)
    sims = out.get("parfumo", {}).get("similar", [])
    out["cheap"] = [s for s in sims if is_cheap(s["brand"])]
    out["similar"] = [s for s in sims if not is_cheap(s["brand"]) and norm(s["brand"]) != norm(brand)]
    out["self_cheap"] = is_cheap(brand)
    return jsonify(out)

@app.get("/")
def index(): return send_from_directory(os.path.join(BASE, "static"), "index.html")
@app.get("/<path:p>")
def st(p): return send_from_directory(os.path.join(BASE, "static"), p)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8787)), threaded=True)
