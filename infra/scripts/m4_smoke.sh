#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

BASE_URL="${BASE_URL:-http://localhost:8083}"
KC_URL="${KC_URL:-http://localhost:8080}"
REALM="${REALM:-myapp-realm}"
CLIENT_ID="${CLIENT_ID:-angular-client}"
TEST_USER="${TEST_USER:-user@test.com}"
TEST_PASS="${TEST_PASS:-user123}"

log() {
    echo "[m4-smoke] $*"
}

fail() {
    echo "[m4-smoke] ERROR: $*" >&2
    exit 1
}

http_json() {
    local method="$1"
    local url="$2"
    local output_file="$3"
    local token="${4:-}"
    local body="${5:-}"

    if [[ -n "$token" && -n "$body" ]]; then
        curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$url" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$body"
    elif [[ -n "$token" ]]; then
        curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$url" \
            -H "Authorization: Bearer $token"
    elif [[ -n "$body" ]]; then
        curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$body"
    else
        curl -sS -o "$output_file" -w "%{http_code}" -X "$method" "$url"
    fi
}

extract_token() {
    local file="$1"
    sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p' "$file"
}

require_status() {
    local actual="$1"
    local expected="$2"
    local context="$3"
    if [[ "$actual" != "$expected" ]]; then
        fail "$context expected HTTP $expected but got HTTP $actual"
    fi
}

log "Starting full stack (docker compose up -d --build)"
cd "$INFRA_DIR"
docker compose up -d --build >/dev/null

log "Waiting for training-service readiness"
for _ in $(seq 1 30); do
    health_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/actuator/health" || true)
    if [[ "$health_code" == "200" || "$health_code" == "401" ]]; then
        break
    fi
    sleep 2
done
if [[ "${health_code:-000}" != "200" && "${health_code:-000}" != "401" ]]; then
    fail "training-service readiness check failed (last HTTP ${health_code:-000})"
fi

log "Acquiring Keycloak token"
token_http=$(curl -sS -o "$TMP_DIR/token.json" -w "%{http_code}" -X POST \
    "$KC_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password" \
    -d "client_id=$CLIENT_ID" \
    -d "username=$TEST_USER" \
    -d "password=$TEST_PASS")
require_status "$token_http" "200" "Keycloak token request"
TOKEN="$(extract_token "$TMP_DIR/token.json")"
[[ -n "$TOKEN" ]] || fail "empty access token"

USER_ID="m4-smoke-$(date +%s)"
QA_USER_ID="m4-qa-$(date +%s)"

log "Checking auth enforcement (unauthenticated request should return 401)"
unauth_http=$(http_json GET "$BASE_URL/api/v1/training/paths/user/$USER_ID" "$TMP_DIR/unauth.json")
require_status "$unauth_http" "401" "Unauthenticated training path request"

log "Creating training path"
create_payload="{\"userId\":\"$USER_ID\",\"status\":\"ACTIVE\",\"xpThreshold\":200}"
create_http=$(http_json POST "$BASE_URL/api/v1/training/paths" "$TMP_DIR/create.json" "$TOKEN" "$create_payload")
require_status "$create_http" "201" "Create training path"

PATH_ID="$(grep -o '"id":[0-9]\+' "$TMP_DIR/create.json" | head -n 1 | cut -d: -f2)"
MODULE_ID="$(grep -o '"modules":\[{"id":[0-9]\+' "$TMP_DIR/create.json" | head -n 1 | grep -o '[0-9]\+$')"
[[ -n "$PATH_ID" ]] || fail "could not extract path id"
[[ -n "$MODULE_ID" ]] || fail "could not extract module id"

for category in COMMUNICATION STRESS_MANAGEMENT CONTENT_PREP BODY_LANGUAGE INDUSTRY_SPECIFIC; do
    grep -q "\"category\":\"$category\"" "$TMP_DIR/create.json" || fail "missing category $category in training path"
done

log "Fetching created training path"
get_http=$(http_json GET "$BASE_URL/api/v1/training/paths/user/$USER_ID" "$TMP_DIR/get_path.json" "$TOKEN")
require_status "$get_http" "200" "Get training path by user"

log "Updating one module to 100%"
update_payload='{"completedLessons":5,"progress":100}'
update_http=$(http_json PUT "$BASE_URL/api/v1/training/paths/$PATH_ID/modules/$MODULE_ID?userId=$USER_ID" "$TMP_DIR/update_module.json" "$TOKEN" "$update_payload")
require_status "$update_http" "200" "Update module progress"
grep -q '"status":"COMPLETED"' "$TMP_DIR/update_module.json" || fail "updated module is not COMPLETED"

log "Recording daily activity (XP/streak + explicit goal counters)"
activity_payload="{\"userId\":\"$USER_ID\",\"xpEarned\":40,\"sessionCompleted\":true,\"goalsCompleted\":1,\"behavioralCount\":1,\"libraryCount\":1,\"quizCount\":1}"
activity_http=$(http_json POST "$BASE_URL/api/v1/training/activities" "$TMP_DIR/activity.json" "$TOKEN" "$activity_payload")
require_status "$activity_http" "200" "Record daily activity"
grep -q '"totalXp":' "$TMP_DIR/activity.json" || fail "daily activity response missing totalXp"

log "Checking today's activity endpoint and explicit counters"
today_http=$(http_json GET "$BASE_URL/api/v1/training/activities/user/$USER_ID/today" "$TMP_DIR/today_activity.json" "$TOKEN")
require_status "$today_http" "200" "Get today activity"
grep -q '"sessionCompleted":true' "$TMP_DIR/today_activity.json" || fail "today activity sessionCompleted mismatch"
grep -q '"behavioralCount":1' "$TMP_DIR/today_activity.json" || fail "today activity behavioralCount mismatch"
grep -q '"libraryCount":1' "$TMP_DIR/today_activity.json" || fail "today activity libraryCount mismatch"
grep -q '"quizCount":1' "$TMP_DIR/today_activity.json" || fail "today activity quizCount mismatch"

log "Checking leaderboard endpoint"
leader_http=$(http_json GET "$BASE_URL/api/v1/training/leaderboard?topN=5" "$TMP_DIR/leaderboard.json" "$TOKEN")
require_status "$leader_http" "200" "Get leaderboard"

log "Running QA badge simulation endpoint"
qa_payload="{\"userId\":\"$QA_USER_ID\"}"
qa_http=$(http_json POST "$BASE_URL/api/v1/training/debug/badges/simulate" "$TMP_DIR/qa_badges.json" "$TOKEN" "$qa_payload")
require_status "$qa_http" "200" "Debug badge simulation"
grep -q '"newlyAwardedBadges":\[' "$TMP_DIR/qa_badges.json" || fail "debug simulation response missing newlyAwardedBadges"

log "M4 smoke suite passed"
log "userId=$USER_ID pathId=$PATH_ID moduleId=$MODULE_ID qaUserId=$QA_USER_ID"
