#!/bin/bash
# Arranca el servidor de Mis Colonias en 127.0.0.1:8787
cd /workspace/colonias
pgrep -f "python3 server.py" >/dev/null || nohup python3 server.py > server.log 2>&1 &
# Túnel (no funciona en este box: solo hay salida por 443 HTTP/WebSocket):
# cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8787
