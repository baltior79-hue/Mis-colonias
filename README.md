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
