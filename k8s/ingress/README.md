# Public Ingress Layer

## Architecture

Public traffic enters through the dedicated ingress worker node:

- Floating IP: 192.168.1.217
- Kubernetes ingress node: k8s-w1
- Traefik binds directly to host ports 80 and 443
- api.interviewprep-tn.me routes to backend microservices
- auth.interviewprep-tn.me routes to Keycloak

## Node preparation

Label the dedicated ingress node:

    kubectl label node k8s-w1 ingress-node=true

## Traefik installation

Install Traefik with classic Kubernetes Ingress support only:

    helm repo add traefik https://traefik.github.io/charts
    helm repo update
    helm install traefik traefik/traefik \
      --namespace traefik \
      --create-namespace \
      --skip-crds \
      -f k8s/ingress/traefik-values.yaml

If Traefik already exists:

    helm upgrade traefik traefik/traefik \
      --namespace traefik \
      --skip-crds \
      -f k8s/ingress/traefik-values.yaml

## Public routes

Apply the final Ingress resources:

    kubectl apply -f k8s/ingress/api-ingress.yaml
    kubectl apply -f k8s/ingress/auth-ingress.yaml

## OpenStack network requirements

The OpenStack security group attached to the ingress node must allow:

- TCP 80
- TCP 443

The floating IP used for ingress is associated with k8s-w1.

## Verified routes

    curl -i -H "Host: api.interviewprep-tn.me" \
      http://192.168.1.217/api/public/health

    curl -i -H "Host: api.interviewprep-tn.me" \
      http://192.168.1.217/api/live-voice/available

    curl -i -H "Host: auth.interviewprep-tn.me" \
      http://192.168.1.217/realms/myapp-realm/.well-known/openid-configuration
