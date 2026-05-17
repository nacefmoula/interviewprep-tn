#!/bin/bash
# ============================================================
# configure-idp-secrets.sh
# Patches Identity Provider client secrets into Keycloak via
# the Admin REST API. Run this once after a fresh deployment.
#
# Usage:
#   KC_ADMIN=admin KC_ADMIN_PASSWORD=devpassword \
#   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx \
#   GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=xxx \
#   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx \
#   ./configure-idp-secrets.sh
# ============================================================

KC_URL="${KC_URL:-http://localhost:8080}"
KC_REALM="${KC_REALM:-myapp-realm}"
KC_ADMIN="${KC_ADMIN:-admin}"
KC_ADMIN_PASSWORD="${KC_ADMIN_PASSWORD:-devpassword}"

echo "🔑 Authenticating with Keycloak at $KC_URL ..."

TOKEN=$(curl -s -X POST "$KC_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=$KC_ADMIN" \
  -d "password=$KC_ADMIN_PASSWORD" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to authenticate with Keycloak. Check KC_ADMIN / KC_ADMIN_PASSWORD."
  exit 1
fi

echo "✅ Authenticated."

patch_idp() {
  local alias=$1
  local client_id=$2
  local client_secret=$3

  if [ -z "$client_id" ] || [ -z "$client_secret" ]; then
    echo "⚠️  Skipping $alias — CLIENT_ID or CLIENT_SECRET not set."
    return
  fi

  echo "🔧 Patching IDP: $alias ..."

  # Fetch current IDP config
  IDP_CONFIG=$(curl -s -X GET \
    "$KC_URL/admin/realms/$KC_REALM/identity-provider/instances/$alias" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")

  if echo "$IDP_CONFIG" | grep -q "error"; then
    echo "❌ IDP '$alias' not found in realm '$KC_REALM'. Skipping."
    return
  fi

  # Patch clientId and clientSecret
  UPDATED=$(echo "$IDP_CONFIG" | python3 -c "
import sys, json
d = json.load(sys.stdin)
d['config']['clientId'] = '$client_id'
d['config']['clientSecret'] = '$client_secret'
print(json.dumps(d))
")

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    "$KC_URL/admin/realms/$KC_REALM/identity-provider/instances/$alias" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATED")

  if [ "$HTTP_STATUS" = "204" ]; then
    echo "✅ $alias updated successfully."
  else
    echo "❌ Failed to update $alias (HTTP $HTTP_STATUS)."
  fi
}

# Patch each identity provider
patch_idp "google"                    "$GOOGLE_CLIENT_ID"    "$GOOGLE_CLIENT_SECRET"
patch_idp "github"                    "$GITHUB_CLIENT_ID"    "$GITHUB_CLIENT_SECRET"
patch_idp "linkedin-openid-connect"   "$LINKEDIN_CLIENT_ID"  "$LINKEDIN_CLIENT_SECRET"

echo ""
echo "✅ Done. All configured IDPs have been patched."
