#!/usr/bin/env bash
# Manual deploy of AI service images to Azure Container Apps.
# Mirrors what .github/workflows/deploy-aca.yml would do once AZURE_CREDENTIALS
# is available. Use this from your laptop while the SP creation is blocked by
# tenant admin permission.
#
# Requires:
#   az logged in as a user with Contributor on rg-piclouddoom
#   The image to deploy must already exist on DockerHub (built by GHA)
#
# Usage:
#   bash scripts/deploy-aca.sh                       # all 3 apps @ current git HEAD
#   bash scripts/deploy-aca.sh <sha>                 # all 3 @ specific sha
#   bash scripts/deploy-aca.sh <sha> <app-name>      # single app
#                                                    # app-name ∈ {ai-training-path, kokoro, ollama}
#
# Environment overrides:
#   RG=rg-piclouddoom          resource group
#   REGISTRY=docker.io/azizbna image registry namespace
#   IMAGE_PREFIX=pi-clouddoom  image name prefix

set -euo pipefail

RG="${RG:-rg-piclouddoom}"
REGISTRY="${REGISTRY:-docker.io/azizbna}"
IMAGE_PREFIX="${IMAGE_PREFIX:-pi-clouddoom}"

SHA="${1:-$(git rev-parse HEAD)}"
SHORT="${SHA:0:7}"
ONLY_APP="${2:-}"

# Pre-flight
command -v az >/dev/null || { echo "az CLI not found" >&2; exit 1; }
az account show --query "{sub:name, user:user.name}" -o table

# app-name → image-name. Bash 3.2-compatible (no associative arrays —
# macOS still ships bash 3.2 by default).
APPS_KEYS=("ai-training-path" "kokoro" "ollama")
image_for() {
  case "$1" in
    ai-training-path) echo "${REGISTRY}/${IMAGE_PREFIX}-ai-training-path" ;;
    kokoro)           echo "${REGISTRY}/${IMAGE_PREFIX}-kokoro" ;;
    ollama)           echo "${REGISTRY}/${IMAGE_PREFIX}-ollama" ;;
    *) echo "unknown-app:$1" >&2; return 1 ;;
  esac
}

failures=0
for app in "${APPS_KEYS[@]}"; do
  if [ -n "$ONLY_APP" ] && [ "$ONLY_APP" != "$app" ]; then
    continue
  fi
  image="$(image_for "$app"):sha-${SHORT}"
  rev="sha-${SHORT}"

  echo ""
  echo "═══ ${app} → ${image} ═══"

  # Pre-state
  az containerapp show \
    --name "$app" --resource-group "$RG" \
    --query "{name:name, latestRev:properties.latestRevisionName, image:properties.template.containers[0].image}" \
    -o table

  # Update
  if ! az containerapp update \
        --name "$app" \
        --resource-group "$RG" \
        --image "$image" \
        --revision-suffix "$rev" \
        --output none; then
    echo "  ✗ az containerapp update failed for $app"
    failures=$((failures+1))
    continue
  fi

  echo "Triggered revision: ${app}--${rev}"

  # Poll
  healthy=0
  for i in $(seq 1 30); do
    state=$(az containerapp revision show \
      --name "$app" --resource-group "$RG" \
      --revision "${app}--${rev}" \
      --query "properties.runningState" -o tsv 2>/dev/null || echo "Unknown")
    echo "  [$i/30] state=$state"
    case "$state" in
      Running|RunningAtMaxScale) echo "  ✓ healthy"; healthy=1; break ;;
      Failed|Degraded)           echo "  ✗ unhealthy ($state)"; break ;;
    esac
    sleep 10
  done
  if [ "$healthy" -ne 1 ]; then
    failures=$((failures+1))
  fi
done

echo ""
if [ "$failures" -gt 0 ]; then
  echo "❌ $failures app(s) failed."
  exit 1
fi
echo "✅ All ACA deploys healthy."
