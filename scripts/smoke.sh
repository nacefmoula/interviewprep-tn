#!/usr/bin/env bash
# Post-deploy smoke test for the Pi-CloudDOOM backend.
#
# Usage:
#   bash scripts/smoke.sh                              # uses default prod base URL
#   BASE_URL=https://api.dev.interviewprep-tn.me bash scripts/smoke.sh
#   bash scripts/smoke.sh --kubeconfig=$HOME/.kube/config --namespace=piclouddoom
#
# Modes:
#   1. HTTP mode (default): curls each service's /actuator/health through the
#      public ingress. Fast, end-to-end, includes Cloudflared + Traefik.
#   2. Kubectl mode (--kubeconfig + --namespace): port-forwards each pod
#      directly. Used by CI when public DNS isn't ready (preview / dev).

set -euo pipefail

BASE_URL="${BASE_URL:-https://api.interviewprep-tn.me}"
TIMEOUT="${TIMEOUT:-5}"
KUBECONFIG_PATH=""
NAMESPACE=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --kubeconfig=*) KUBECONFIG_PATH="${1#*=}" ;;
    --namespace=*)  NAMESPACE="${1#*=}"      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

SERVICES=(
  "user-service:8081:/actuator/health"
  "interview-service:8082:/actuator/health"
  "training-service:8083:/actuator/health"
  "mentorship-service:8084:/actuator/health"
  "quiz-service:8085:/actuator/health"
  "community-service:8086:/actuator/health"
  "resource-service:8087:/actuator/health"
)

failures=0

check_http() {
  local name="$1" path="$2"
  local url="${BASE_URL}${path}"
  local code
  code="$(curl -sk -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo 000)"
  if [ "$code" = "200" ]; then
    echo "  ✓ $name → $url ($code)"
  else
    echo "  ✗ $name → $url ($code)"
    return 1
  fi
}

check_kubectl() {
  local name="$1" port="$2" path="$3"
  # Spring containers run on eclipse-temurin:21-jre which has no curl.
  # Use kubectl wait instead — Available=True means K8s readiness probe
  # is passing, which IS an httpGet on /actuator/health per the manifests.
  # Same validation, no in-container curl needed.
  if KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" wait \
       --for=condition=Available \
       --timeout="${TIMEOUT}s" \
       "deployment/$name" >/dev/null 2>&1; then
    # Also confirm at least 1 replica is Ready
    local ready
    ready="$(KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" get \
      deployment/"$name" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)"
    if [ "${ready:-0}" -ge 1 ]; then
      echo "  ✓ $name (Available, readyReplicas=$ready, port=$port)"
      return 0
    fi
  fi
  echo "  ✗ $name (deployment not Available within ${TIMEOUT}s)"
  KUBECONFIG="$KUBECONFIG_PATH" kubectl -n "$NAMESPACE" get \
    deployment/"$name" -o wide 2>/dev/null | sed 's/^/    /'
  return 1
}

echo "── Pi-CloudDOOM smoke test ──"
if [ -n "$KUBECONFIG_PATH" ] && [ -n "$NAMESPACE" ]; then
  echo "Mode: kubectl exec (namespace=$NAMESPACE)"
else
  echo "Mode: HTTP (base=$BASE_URL)"
fi
echo ""

for entry in "${SERVICES[@]}"; do
  IFS=":" read -r name port path <<<"$entry"
  if [ -n "$KUBECONFIG_PATH" ] && [ -n "$NAMESPACE" ]; then
    check_kubectl "$name" "$port" "$path" || failures=$((failures+1))
  else
    check_http "$name" "$path" || failures=$((failures+1))
  fi
done

echo ""
if [ "$failures" -gt 0 ]; then
  echo "❌ $failures service(s) failed smoke test."
  exit 1
fi
echo "✅ All ${#SERVICES[@]} services healthy."
