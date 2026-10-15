#!/usr/bin/env bash
# usage: publish.sh <slug> "<commit message>" "<repo description>"
set -euo pipefail
slug=$1; msg=$2; desc=$3; cd /workspace/$slug
if grep -rIlE "(AIza[0-9A-Za-z_-]{30,}|-----BEGIN (RSA |EC )?PRIVATE KEY|gho_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|sk_live_)" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git . ; then echo "SECRET-LIKE STRING FOUND"; exit 1; fi
git config user.name "Tommy Keeley"; git config user.email tommy@muckstack.com
git add -A; git diff --cached --quiet || git commit -q -m "$msg"
if ! gh repo view tommy-muckstack/$slug >/dev/null 2>&1; then gh repo create tommy-muckstack/$slug --public --description "$desc" --source . --remote origin >/dev/null; fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/tommy-muckstack/$slug.git
git push -u origin main 2>&1 | tail -2; echo "https://github.com/tommy-muckstack/$slug"
