#!/usr/bin/env bash
# Mint a kubeconfig for the cicd-deployer ServiceAccount.
# Run on k8s-cp1 (or any host with kubectl access). Stdout is the kubeconfig
# — redirect to a file, paste the contents into a GitHub secret, then shred.
#
# Common cases:
#
#   # Local / LAN reachable (cluster API on private IP):
#   bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-prod.yaml
#
#   # Public hostname via Cloudflare Tunnel — recommended for GitHub Actions:
#   API_SERVER=https://k8s-api.interviewprep-tn.me \
#   PUBLIC_API=true \
#     bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-prod.yaml
#
#   # Dev namespace:
#   NAMESPACE=piclouddoom-dev \
#   API_SERVER=https://k8s-api.interviewprep-tn.me PUBLIC_API=true \
#     bash scripts/extract-kubeconfig.sh > /tmp/kubeconfig-dev.yaml
#
# PUBLIC_API=true → omits the internal K8s CA so kubectl validates the
# Cloudflare edge cert against the system trust store. Without this flag,
# kubectl would refuse to connect because the internal CA doesn't sign
# the Cloudflare-fronted hostname.

set -euo pipefail

NAMESPACE="${NAMESPACE:-piclouddoom}"
SA="${SA:-cicd-deployer}"
SECRET="${SECRET:-cicd-deployer-token}"
CLUSTER_NAME="${CLUSTER_NAME:-piclouddoom-openstack}"
CONTEXT_NAME="${CONTEXT_NAME:-cicd@piclouddoom}"

# Pre-flight
command -v kubectl >/dev/null || { echo "kubectl not found" >&2; exit 1; }
kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || { echo "Namespace $NAMESPACE not found" >&2; exit 1; }
kubectl -n "$NAMESPACE" get sa "$SA" >/dev/null 2>&1 \
  || { echo "ServiceAccount $SA missing — did you apply k8s/rbac/cicd-deployer.yaml?" >&2; exit 1; }

# Wait briefly for the token controller to populate the secret
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if kubectl -n "$NAMESPACE" get secret "$SECRET" -o jsonpath='{.data.token}' 2>/dev/null | grep -q .; then
    break
  fi
  sleep 1
done

TOKEN_B64="$(kubectl -n "$NAMESPACE" get secret "$SECRET" -o jsonpath='{.data.token}')"
if [ -z "$TOKEN_B64" ]; then
  echo "Secret $SECRET has no token populated yet. Retry in a few seconds." >&2
  exit 1
fi
TOKEN="$(echo "$TOKEN_B64" | base64 -d)"
CA_B64="$(kubectl -n "$NAMESPACE" get secret "$SECRET" -o jsonpath='{.data.ca\.crt}')"

# API server URL — must be reachable from GitHub Actions runners.
# Default: read from existing admin kubeconfig (internal cluster IP).
# For public access via Cloudflare Tunnel, override:
#   API_SERVER=https://k8s-api.interviewprep-tn.me PUBLIC_API=true
API_SERVER="${API_SERVER:-$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')}"
PUBLIC_API="${PUBLIC_API:-false}"

# When fronted by a public hostname (Cloudflare etc.), kubectl needs to
# validate the edge cert against system trust roots, NOT the internal K8s CA.
# Omit certificate-authority-data in that case.
if [ "$PUBLIC_API" = "true" ]; then
  CLUSTER_BLOCK="      server: ${API_SERVER}"
else
  CLUSTER_BLOCK="      server: ${API_SERVER}
      certificate-authority-data: ${CA_B64}"
fi

cat <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: ${CLUSTER_NAME}
    cluster:
${CLUSTER_BLOCK}
contexts:
  - name: ${CONTEXT_NAME}
    context:
      cluster: ${CLUSTER_NAME}
      namespace: ${NAMESPACE}
      user: ${SA}
current-context: ${CONTEXT_NAME}
users:
  - name: ${SA}
    user:
      token: ${TOKEN}
EOF
