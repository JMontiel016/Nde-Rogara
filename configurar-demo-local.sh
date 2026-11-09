#!/usr/bin/env bash
# Configura contraseñas SOLO en un archivo local ignorado por Git.
set -euo pipefail
cd "$(dirname "$0")"
touch .env.local
chmod 600 .env.local
printf 'Cuenta admin: admin@admin.com.py\nCuenta inmobiliaria: 016.jmma@gmail.com\n'
read -rs -p 'Contraseña de demostración para admin: ' admin; printf '\n'
read -rs -p 'Contraseña de demostración para inmobiliaria: ' owner; printf '\n'
if [[ ${#admin} -lt 8 || ${#owner} -lt 8 || "$admin" == *$'\n'* || "$owner" == *$'\n'* ]]; then
  echo 'Usá claves de 8 caracteres como mínimo, sin saltos de línea.' >&2
  exit 1
fi
# Acepta contraseñas sencillas sin comillas, $ o barras para facilitar el parseo dotenv.
if [[ "$admin" == *'"'* || "$admin" == *"'"* || "$admin" == *'$'* || "$owner" == *'"'* || "$owner" == *"'"* || "$owner" == *'$'* ]]; then
  echo 'Para la demo, evitá comillas y el símbolo $. Elegí otra clave.' >&2
  exit 1
fi
printf '%s\n%s\n' "$admin" "$owner" | python3 -c '
from pathlib import Path
import sys
admin = sys.stdin.readline().rstrip("\n")
owner = sys.stdin.readline().rstrip("\n")
p = Path(".env.local")
lines = p.read_text().splitlines()
lines = [line for line in lines if not line.startswith(("DEMO_ADMIN_PASSWORD=", "DEMO_OWNER_PASSWORD="))]
lines += [f"DEMO_ADMIN_PASSWORD={admin}", f"DEMO_OWNER_PASSWORD={owner}"]
p.write_text("\n".join(lines) + "\n")
'
chmod 600 .env.local
printf 'Configuración privada guardada en .env.local. Reiniciá npm run dev.\n'
