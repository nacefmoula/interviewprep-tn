# 🏗️ Pi-CloudDOOM — Infrastructure

Lance toute l'infrastructure (back, AI, frontend, observabilité locale) en une seule commande.

## Ce qui démarre

### Infrastructure
| Service        | Port  | Usage                          |
| -------------- | ----- | ------------------------------ |
| PostgreSQL     | 5432  | Base de données principale     |
| pgAdmin        | 5050  | UI Postgres (admin@example.com / admin123) |
| Redis          | 6379  | Cache et sessions              |
| Kafka          | 9092  | Broker de messages             |
| Zookeeper      | 2181  | Coordination Kafka             |
| Keycloak       | 8080  | Serveur d'identité (admin / voir `.env`) |
| MailHog        | 8025  | UI email de dev (SMTP 1025)    |
| MinIO          | 9000  | Stockage objet S3-compatible   |
| Ollama         | 11434 | LLM local (llama3.2:3b)        |
| Whisper        | 8000  | Speech-to-text                 |
| Kokoro         | 8880  | Text-to-speech                 |

### Microservices (Spring Boot, sauf indication)
| Service             | Port | DB              |
| ------------------- | ---- | --------------- |
| user-service        | 8081 | userdb          |
| interview-service   | 8082 | interviewdb     |
| training-service    | 8083 | trainingdb      |
| mentorship-service  | 8084 | mentorship_db   |
| quiz-service        | 8085 | quizdb          |
| community-service   | 8086 | communitydb     |
| resource-service    | 8087 | resourcedb      |
| ai-training-path    | 8001 | (FastAPI, no DB) |
| frontend (Angular)  | 4200 | —               |

## Prérequis

- Docker >= 24.0
- Docker Compose >= 2.20

## Démarrage

### 1. Configurer l'environnement

```bash
cd infra/
cp .env.example .env
```

Le realm Keycloak (`infra/keycloak/realm-export.json`) est déjà versionné — aucune action manuelle.

**Clés API — REQUISES**

Avant de lancer, ouvrir `infra/.env` et renseigner :
- `GROQ_API_KEY` — `interview-service` et `community-service` refusent de démarrer sans (https://console.groq.com/keys, gratuit).
- `GOOGLE_AI_API_KEY` — Training Coach chatbot (https://aistudio.google.com/app/apikey, gratuit). Sans, le bouton coach reste désactivé sans crasher.

### 2. Lancer

```bash
docker compose up -d
docker compose ps
```

Le premier démarrage prend ~90 s (Keycloak importe le realm). Tous les services doivent afficher `healthy` ou `Up`.

### 3. Créer les utilisateurs de test

```bash
./scripts/seed-test-users.sh
```

Crée trois utilisateurs via l'API admin de Keycloak (idempotent) :
- `admin@test.com / admin123` — ROLE_ADMIN
- `user@test.com / user123` — ROLE_USER
- `mentor@test.com / mentor123` — ROLE_MENTOR (endpoints mentorship-service)

> ⚠️ **Piège mot de passe Postgres** — `POSTGRES_PASSWORD` est gravé dans le volume `infra_pgdata` au tout premier `up`. Si tu modifies `.env` ensuite, l'ancien mot de passe reste actif côté Postgres et Keycloak/Spring afficheront `FATAL: password authentication failed`. Solution : soit aligner `.env` sur l'ancienne valeur, soit `docker compose down -v` pour repartir de zéro (⚠️ efface toutes les données).

## Lancer uniquement l'application + dépendances

```bash
docker compose up -d --build user-service
```

## Lancer tout le stack (backend + frontend)

```bash
docker compose up -d --build
```

## Smoke test M4 (one-command)

Script automatique pour valider M4 Training & Gamification (sécurité, création de path, update module, activité XP/streak, leaderboard, simulation badges QA):

```bash
./scripts/m4_smoke.sh
```

## Topics Kafka créés automatiquement

| Topic           | Usage              |
| --------------- | ------------------ |
| user.created    | Nouvel utilisateur |
| user.updated    | Profil modifié     |
| user.deleted    | Compte supprimé    |
| user.events.DLQ | Messages en échec  |

## Configuration Spring Boot (référence)

Les services Spring lisent leur config depuis les variables d'environnement (`SPRING_DATASOURCE_*`, `SPRING_REDIS_*`, etc.) injectées par docker-compose. Pour exécuter un service en local **hors Docker** (`mvn spring-boot:run`), prévoir un `application.yml` du type :

```yaml
spring:
    datasource:
        url: jdbc:postgresql://localhost:5432/userdb
        username: ${SPRING_DATASOURCE_USERNAME:postgres}
        password: ${SPRING_DATASOURCE_PASSWORD}   # voir infra/.env
    data:
        redis:
            host: localhost
            port: 6379
            password: ${SPRING_REDIS_PASSWORD}
    kafka:
        bootstrap-servers: localhost:9092

keycloak:
    issuer-uri: http://localhost:8080/realms/myapp-realm
```

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f postgres
docker compose logs -f kafka
docker compose logs -f keycloak

# Entrer dans PostgreSQL
docker compose exec postgres psql -U postgres -d userdb

# Entrer dans Redis (utilise la valeur de REDIS_PASSWORD dans .env)
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"

# Lister les topics Kafka
docker compose exec kafka kafka-topics \
  --bootstrap-server localhost:9092 --list

# Arrêter sans perdre les données
docker compose stop

# Tout supprimer (ATTENTION : efface les données)
docker compose down -v
```

## Dépannage

**Keycloak ne démarre pas** → Normal, il prend 60 secondes. Attendre et vérifier :

```bash
docker compose logs keycloak
```

**Port déjà utilisé** → Modifier le port dans `.env` :

```
POSTGRES_PORT=5433
```

**Topics Kafka non créés** → Vérifier :

```bash
docker compose logs kafka-init
docker compose restart kafka-init
```
