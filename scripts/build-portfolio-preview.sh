#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

AGENCYOS_REPO="https://github.com/faizansaiyed123/agencyos_frontend.git"
AGENCYOS_SHA="95321f21724d2d71213ea6a98d594168e690ab1b"

# Fetch the already-reviewed demo commit read-only; never push to AgencyOS.
git init "$TMP/agencyos"
git -C "$TMP/agencyos" remote add origin "$AGENCYOS_REPO"
git -C "$TMP/agencyos" fetch --depth 1 origin "$AGENCYOS_SHA"
git -C "$TMP/agencyos" checkout --detach FETCH_HEAD

# Mount React Router beneath /agencyos-demo so routes and refreshes stay inside
# the portfolio preview path instead of escaping to the site root.
python3 - "$TMP/agencyos/src/main.tsx" <<'PYTHON'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
needle = "<BrowserRouter>"
replacement = "<BrowserRouter basename={import.meta.env.BASE_URL}>"
if source.count(needle) != 1:
    raise SystemExit("Expected exactly one BrowserRouter in AgencyOS main.tsx")
path.write_text(source.replace(needle, replacement))
PYTHON

npm --prefix "$TMP/agencyos" ci
npm --prefix "$TMP/agencyos" run build -- --base=/agencyos-demo/

# Package the existing portfolio and the isolated AgencyOS browser preview.
rm -rf "$ROOT/out"
mkdir -p "$ROOT/out/agencyos-demo"
cp -a "$ROOT/index.html" "$ROOT/project-lab.html" "$ROOT/script.js" \
  "$ROOT/project-lab.js" "$ROOT/style.css" "$ROOT/project-lab.css" \
  "$ROOT/agencyos-preview.js" "$ROOT/agencyos-preview.css" "$ROOT/out/"
cp -a "$ROOT/data" "$ROOT/assets" "$ROOT/out/"
cp -a "$TMP/agencyos/dist/." "$ROOT/out/agencyos-demo/"

echo "Portfolio and AgencyOS browser preview assembled in out/"
echo "AgencyOS source: $AGENCYOS_SHA"
echo "AgencyOS public path: /agencyos-demo/"
