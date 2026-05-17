#!/usr/bin/env bash
# seed-test-users.sh — create the canonical test users in the myapp-realm.
#
# Idempotent: safe to re-run. Skips users that already exist (matches by email).
#
# Reads KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD / KEYCLOAK_PORT / KC_REALM_NAME
# from infra/.env (sibling of this script's parent directory).
#
# Creates:
#   admin@test.com  / admin123   — assigned realm role ROLE_ADMIN
#   user@test.com   / user123    — assigned realm role ROLE_USER
#   mentor@test.com / mentor123  — assigned realm role ROLE_MENTOR

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
INFRA_DIR="$(dirname -- "$SCRIPT_DIR")"
ENV_FILE="$INFRA_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ $ENV_FILE not found — run \`cp infra/.env.example infra/.env\` first." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

KC_HOST="http://localhost:${KEYCLOAK_PORT:-8080}"
REALM="${KC_REALM_NAME:-myapp-realm}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD must be set in .env}"

echo "→ Waiting for Keycloak at $KC_HOST/realms/$REALM ..."
for i in $(seq 1 60); do
  if curl -sfo /dev/null "$KC_HOST/realms/$REALM"; then
    break
  fi
  if (( i == 60 )); then
    echo "✗ Keycloak didn't respond at $KC_HOST/realms/$REALM after 60 tries" >&2
    echo "  Is the stack up? Try: cd infra && docker compose ps" >&2
    exit 1
  fi
  sleep 2
done
echo "  ✓ Keycloak is ready"

echo "→ Getting admin token (master realm)..."
TOKEN=$(curl -sf -X POST "$KC_HOST/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=$ADMIN_USER" \
  --data-urlencode "password=$ADMIN_PASS" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=admin-cli" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
if [[ -z "$TOKEN" ]]; then
  echo "✗ Failed to obtain admin token. Check KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD in .env" >&2
  exit 1
fi
echo "  ✓ got admin token"

# create_user <email> <password> <role>
create_user() {
  local email="$1" password="$2" role="$3"
  echo "→ Seeding $email (role $role) ..."

  # Already exists?
  local existing
  existing=$(curl -sf -H "Authorization: Bearer $TOKEN" \
    "$KC_HOST/admin/realms/$REALM/users?email=$email&exact=true" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")

  local user_id="$existing"
  if [[ -z "$user_id" ]]; then
    # POST returns 201 with Location: .../users/<id>
    local location
    location=$(curl -sf -D - -o /dev/null -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "$KC_HOST/admin/realms/$REALM/users" \
      -d "{
        \"username\": \"$email\",
        \"email\": \"$email\",
        \"emailVerified\": true,
        \"enabled\": true,
        \"firstName\": \"Test\",
        \"lastName\": \"User\"
      }" | grep -i '^location:' | tr -d '\r' | awk '{print $2}')
    user_id="${location##*/}"
    echo "  ✓ created user id=$user_id"
  else
    echo "  ↺ user exists id=$user_id (skipping create)"
  fi

  # Set/reset password
  curl -sf -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$KC_HOST/admin/realms/$REALM/users/$user_id/reset-password" \
    -d "{\"type\":\"password\",\"value\":\"$password\",\"temporary\":false}"
  echo "  ✓ password set"

  # Assign realm role (look up role definition first)
  local role_json
  role_json=$(curl -sf -H "Authorization: Bearer $TOKEN" \
    "$KC_HOST/admin/realms/$REALM/roles/$role")
  curl -sf -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$KC_HOST/admin/realms/$REALM/users/$user_id/role-mappings/realm" \
    -d "[$role_json]"
  echo "  ✓ role $role assigned"
}

create_user "admin@test.com"  "admin123"  "ROLE_ADMIN"
create_user "user@test.com"   "user123"   "ROLE_USER"
create_user "mentor@test.com" "mentor123" "ROLE_MENTOR"

echo ""
echo "✅ Done. You can now log in at http://localhost:4200 with:"
echo "    admin@test.com  / admin123   (ROLE_ADMIN)"
echo "    user@test.com   / user123    (ROLE_USER)"
echo "    mentor@test.com / mentor123  (ROLE_MENTOR)"
