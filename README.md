# Mis-colonias

PWA para guardar colonias con foto, analizar notas desde Fragrantica/Parfumo y ver clones baratos.

## Arranque local

```bash
pip install -r requirements.txt
gunicorn server:app --bind 0.0.0.0:8000
```

La página principal está en http://127.0.0.1:8000/

## Render

`render.yaml` define el servicio web. El build instala `requirements.txt` y el arranque es:

```bash
gunicorn server:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120
```

## Vercel

Importa el repositorio en [vercel.com/new](https://vercel.com/new) con el plan Hobby. Vercel detecta Flask por la dependencia en `requirements.txt` y `pyproject.toml` (Python 3.12).

`pyproject.toml` fija el entrypoint en `api.index:app`. `vercel.json` reescribe todas las rutas a `/api/index`, incluye `server.py` y `static/**` en la función y deja la duración máxima en 60 segundos. La caché sqlite se escribe en `CACHE_DIR` o, si no está definida, en `/tmp`.
