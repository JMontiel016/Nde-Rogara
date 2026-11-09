#!/usr/bin/env bash
# Publicación guiada. Sin --subir solo revisa y prepara archivos para GitHub.
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:---revisar}"
if [[ "$MODE" != "--revisar" && "$MODE" != "--subir" ]]; then
  echo "Uso: bash publicar_github_seguro.sh [--revisar|--subir]" >&2; exit 2
fi
REPO='https://github.com/JMontiel016/Nde-Rogara.git'
if [[ ! -d .git ]]; then git init -q -b main; fi
if ! git check-ignore -q .env.local; then
  echo 'ERROR: .env.local no está excluido de Git.' >&2; exit 1
fi
# Para proyectos ya existentes, respeta la rama actual; no fuerza historiales ni borra nada.
BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != 'main' ]]; then
  echo "Estás en la rama $BRANCH. Revisa tu historial antes de publicar; no se cambió la rama." >&2; exit 1
fi
remote="$(git remote get-url origin 2>/dev/null || true)"
if [[ -n "$remote" && "$remote" != "$REPO" && "$remote" != 'git@github.com:JMontiel016/Nde-Rogara.git' ]]; then
  echo "El remoto origin apunta a otro sitio: $remote" >&2; exit 1
fi
# El usuario controla los archivos; excluimos dependencias, secretos y builds mediante .gitignore.
git add -A
if git diff --cached --name-only | grep -Ei '(^|/)(\.env([.]|$)|node_modules/|dist/|backups?/|uploads?/|private/|.*[.]pem$|.*[.]p12$|.*[.]pfx$|.*[.]key$|serviceAccountKey[.]json$)' | grep -Ev '(^|/)\.env\.example$' >/dev/null; then
  echo 'ERROR: Se encontró un archivo confidencial o generado en el área de publicación.' >&2
  exit 1
fi
# Barrido de indicadores comunes (no sustituye una auditoría de seguridad completa).
if git grep --cached -I -n -E -- '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|github_pat_[A-Za-z0-9_]{20}|ghp_[A-Za-z0-9]{20}|sk_live_[A-Za-z0-9]{15}|"private_key"[[:space:]]*:[[:space:]]*"-----BEGIN' >/dev/null; then
  echo 'ERROR: Se detectó un posible secreto en los archivos preparados.' >&2
  exit 1
fi
printf '\nArchivos preparados para publicar: %s\n' "$(git diff --cached --name-only | wc -l)"
printf 'Cambios locales preparados:\n'
git diff --cached --stat | tail -12
if [[ "$MODE" == '--revisar' ]]; then
  echo 'Revisión básica completa. No se publicó nada. Revisa git diff --cached --name-only y ejecuta --subir cuando estés listo.'
  exit 0
fi
# GitHub debe estar configurado con una clave SSH o un token/credential manager en esta máquina.
if [[ -z "$remote" ]]; then git remote add origin "$REPO"; fi
if ! git diff --cached --quiet; then
  git -c user.name="JMontiel016" -c user.email="github-actions@users.noreply.github.com" commit -m 'Preparar Nde Rogara y comprobantes de contratacion de demostracion'
fi
# Nunca usar --force. Si el repositorio cambió, Git rechazará el push de forma segura.
git push -u origin main
echo "Proyecto enviado a $REPO"
