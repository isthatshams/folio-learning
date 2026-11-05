#!/usr/bin/env bash
# Tiny FOLIO API helper for learning.
#
# Usage:
#   ./folio.sh GET  '/inventory/instances?query=title=semantic&limit=3'
#   ./folio.sh POST '/some/path' '{"json":"body"}'
#
# Target the public demo (default) or your local FOLIO:
#   FOLIO=local ./folio.sh GET /users?limit=1

set -euo pipefail

if [ "${FOLIO:-demo}" = "local" ]; then
  GATEWAY="http://localhost:8000"
else
  GATEWAY="https://folio-etesting-snapshot-kong.ci.folio.org"
fi
TENANT="${TENANT:-diku}"
USERNAME="${USERNAME_FOLIO:-diku_admin}"
PASSWORD="${PASSWORD_FOLIO:-admin}"

METHOD="${1:?method required (GET/POST/PUT/DELETE)}"
API_PATH="${2:?path required, e.g. /users?limit=1}"
BODY="${3:-}"

# Step 1: log in -> the access token comes back in a Set-Cookie header.
TOKEN=$(curl -s -i -X POST "$GATEWAY/authn/login-with-expiry" \
  -H 'Content-Type: application/json' \
  -H "x-okapi-tenant: $TENANT" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | grep -i '^set-cookie: folioAccessToken=' \
  | sed -E 's/^[^=]*=([^;]+).*/\1/')

if [ -z "$TOKEN" ]; then
  echo "Login failed (gateway: $GATEWAY)" >&2
  exit 1
fi

# Step 2: call the API with tenant + token headers.
ARGS=(-s -X "$METHOD" "$GATEWAY$API_PATH"
  -H "x-okapi-tenant: $TENANT"
  -H "x-okapi-token: $TOKEN"
  -H 'Content-Type: application/json')
[ -n "$BODY" ] && ARGS+=(-d "$BODY")

# Print the HTTP status on stderr, then the body:
# pretty-printed if it's JSON, raw otherwise (so errors are never hidden).
RESPONSE=$(curl "${ARGS[@]}" -w $'\n%{http_code}')
STATUS="${RESPONSE##*$'\n'}"
BODY_OUT="${RESPONSE%$'\n'*}"
echo "HTTP $STATUS" >&2
printf '%s\n' "$BODY_OUT" | python3 -m json.tool 2>/dev/null || printf '%s\n' "$BODY_OUT"
