# Community Service — Module 6

## Overview

Community Service is a Spring Boot 3.x microservice that provides comprehensive community and social features for **InterviewPrep TN**, a platform helping Tunisian graduates prepare for job interviews. Module 6 encompasses all social and community interactions, including posts, comments, follow relationships, user profiles, and a karma-based reputation system.

---

## Developer

- **Name:** Aziz BenAmor
- **Module:** M6 — Community & Social
- **Branch:** `feature/m6-community-service`
- **Repository:** InterviewPrep TN Platform

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 21 | Programming Language |
| Spring Boot | 3.5.12 | Framework & Runtime |
| Spring Data JPA | Latest | Database ORM & Persistence |
| Spring Security | Latest | Authentication & Authorization |
| Spring OAuth2 Resource Server | Latest | JWT Validation & Keycloak Integration |
| PostgreSQL | 16 | Relational Database |
| Flyway | Latest | Database Migration Management |
| Lombok | Latest | Boilerplate Reduction |
| Maven | 3.8+ | Build & Dependency Management |

---

## Port

```
8086
```

---

## Database

### Database Name
```sql
communitydb
```

### Tables

#### 1. **posts**
Stores user-created discussion posts with content, metadata, and engagement metrics.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `author_keycloak_id` | VARCHAR(255) | NOT NULL, Foreign Key to Keycloak |
| `title` | VARCHAR(500) | NOT NULL |
| `content` | TEXT | NOT NULL |
| `type` | VARCHAR(50) | NOT NULL (e.g., "Question", "Discussion", "Practice Partner") |
| `industry` | VARCHAR(50) | Nullable (e.g., "Tech", "Finance") |
| `tags` | VARCHAR(500) | Comma-separated tags |
| `upvotes` | INTEGER | DEFAULT 0 |
| `downvotes` | INTEGER | DEFAULT 0 |
| `view_count` | INTEGER | DEFAULT 0 |
| `is_pinned` | BOOLEAN | DEFAULT false |
| `is_reported` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

**Indexes:** `idx_posts_author`, `idx_posts_type`, `idx_posts_industry`

---

#### 2. **comments**
Stores nested comments on posts with support for threading via `parent_comment_id`.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `post_id` | BIGINT | NOT NULL, REFERENCES posts(id) ON DELETE CASCADE |
| `author_keycloak_id` | VARCHAR(255) | NOT NULL, Foreign Key to Keycloak |
| `content` | TEXT | NOT NULL |
| `parent_comment_id` | VARCHAR(50) | Nullable, enables nested comments |
| `upvotes` | INTEGER | DEFAULT 0 |
| `is_edited` | BOOLEAN | DEFAULT false |
| `is_reported` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMP | DEFAULT NOW() |

**Indexes:** `idx_comments_post_id`

---

#### 3. **follows**
Tracks follower/following relationships between users.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `follower_keycloak_id` | VARCHAR(255) | NOT NULL, Foreign Key to Keycloak |
| `following_keycloak_id` | VARCHAR(255) | NOT NULL, Foreign Key to Keycloak |
| `followed_at` | TIMESTAMP | DEFAULT NOW() |
| Composite | UNIQUE | (follower_keycloak_id, following_keycloak_id) |

**Indexes:** `idx_follows_follower`, `idx_follows_following`

---

#### 4. **karma_scores**
Maintains aggregated karma and contribution metrics per user.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `keycloak_id` | VARCHAR(255) | NOT NULL, UNIQUE |
| `display_name` | VARCHAR(255) | Nullable |
| `total_karma` | INTEGER | NOT NULL, DEFAULT 0 |
| `posts_count` | INTEGER | NOT NULL, DEFAULT 0 |
| `comments_count` | INTEGER | NOT NULL, DEFAULT 0 |
| `upvotes_received` | INTEGER | NOT NULL, DEFAULT 0 |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

**Indexes:** `idx_karma_keycloak_id`, `idx_karma_total` (DESC)

---

#### 5. **post_bookmarks** (NEW — Module 6.2)
Stores user bookmarks for saving favorite posts for later reference.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `user_keycloak_id` | VARCHAR(255) | NOT NULL, Foreign Key to Keycloak |
| `post_id` | BIGINT | NOT NULL, REFERENCES posts(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| Composite | UNIQUE | (user_keycloak_id, post_id) |

**Indexes:** `idx_bookmarks_user`, `idx_bookmarks_post`

---

#### 6. **flyway_schema_history**
Automatic table created by Flyway for migration version tracking.

| Column | Type | Purpose |
|--------|------|---------|
| `installed_rank` | INTEGER | Migration order |
| `version` | VARCHAR(50) | Migration version |
| `description` | VARCHAR(255) | Migration name |
| `type` | VARCHAR(20) | Migration type (SQL, UNDO, etc.) |
| `script` | VARCHAR(1000) | Script filename |
| `checksum` | INTEGER | Integrity check |
| `installed_by` | VARCHAR(100) | Installer |
| `installed_on` | TIMESTAMP | Installation timestamp |
| `execution_time` | INTEGER | Execution time (ms) |
| `success` | BOOLEAN | Success status |

## Project Structure

```
src/main/java/com/microservice/community_service/
├── model/               # JPA entities
│   ├── Post.java       # Community post with voting & view tracking
│   ├── Comment.java    # Threaded comments with upvotes
│   ├── Follow.java     # User follow relationships
│   └── PostBookmark.java # NEW: User post bookmarks for saving favorites
├── repository/         # JPA repositories (Spring Data)
│   ├── PostRepository.java
│   ├── CommentRepository.java
│   ├── FollowRepository.java
│   └── PostBookmarkRepository.java # NEW: Bookmark queries
├── dto/                # Data transfer objects
│   ├── PostResponse.java
│   ├── CreatePostRequest.java
│   ├── UpdatePostRequest.java
│   ├── CommentResponse.java
│   ├── CreateCommentRequest.java
│   ├── FollowResponse.java
│   └── PageResponse.java
├── service/            # Business logic
│   ├── CommunityService.java
│   └── PostBookmarkService.java # NEW: Bookmark operations
├── controller/         # REST endpoints
│   ├── CommunityController.java
│   └── PostBookmarkController.java # NEW: Bookmark endpoints
├── config/             # Spring configuration
│   ├── SecurityConfig.java
│   └── JwtAuthConverter.java
└── exception/          # Global error handling
    └── GlobalExceptionHandler.java

src/main/resources/
├── application.yaml    # Configuration
└── db/migration/
    └── V1__create_community_tables.sql
```

---

## API Endpoints

All endpoints are relative to `/api/community`.

### Posts (11 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/posts` | Public | Fetch paginated posts with filtering by type, industry, and sorting |
| `GET` | `/posts/search` | Public | Full-text search posts by title, content, and tags |
| `GET` | `/posts/feed` | Authenticated | Fetch paginated posts from users the current user follows (NEW) |
| `GET` | `/posts/{id}` | Public | Retrieve a specific post by ID |
| `POST` | `/posts` | Authenticated | Create a new post |
| `PUT` | `/posts/{id}` | Authenticated | Update a post (owner-only) |
| `DELETE` | `/posts/{id}` | Authenticated | Delete a post (owner or admin) |
| `POST` | `/posts/{id}/upvote` | Public | Increment post upvote count |
| `POST` | `/posts/{id}/downvote` | Public | Increment post downvote count |
| `POST` | `/posts/{id}/report` | Public | Flag a post as inappropriate |

### Comments (4 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/posts/{postId}/comments` | Public | Retrieve all comments for a post (nested threading) |
| `POST` | `/posts/{postId}/comments` | Authenticated | Add a comment to a post (supports parent comment ID for nesting) |
| `DELETE` | `/comments/{id}` | Authenticated | Delete a comment (owner-only) |
| `POST` | `/comments/{id}/upvote` | Public | Increment comment upvote count |

### Follows (5 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/follow/{targetKeycloakId}` | Authenticated | Follow a user |
| `DELETE` | `/follow/{targetKeycloakId}` | Authenticated | Unfollow a user |
| `GET` | `/follow/{keycloakId}/status` | Authenticated | Check if current user follows a target user |
| `GET` | `/follow/followers` | Authenticated | Get list of users following the current user |
| `GET` | `/follow/following` | Authenticated | Get list of users the current user is following |

### Karma (3 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/karma/leaderboard` | Public | Get top 10 users by karma score |
| `GET` | `/karma/me` | Authenticated | Get current user's karma stats |
| `GET` | `/karma/{keycloakId}` | Public | Get karma stats for a specific user |

### Bookmarks (4 endpoints — NEW Module 6.2)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/bookmarks/{postId}/toggle` | Authenticated | Toggle bookmark status for a post (NEW) |
| `GET` | `/bookmarks` | Authenticated | Retrieve user's bookmarked posts (NEW) |
| `GET` | `/bookmarks/{postId}/status` | Authenticated | Check if current user has bookmarked a specific post (NEW) |
| `GET` | `/bookmarks/{postId}/count` | Public | Get total bookmark count for a post (NEW) |

### User Profile (2 endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/{keycloakId}/profile` | Public | Get user's community profile (posts, comments, karma, followers) |
| `GET` | `/users/{keycloakId}/is-following` | Authenticated | Check if current user follows a specific user |

### Summary

- **Total Endpoints:** 29 (was 23)
- **Authenticated:** 14 (was 10)
- **Public:** 15 (was 13)

---

## Features Implemented

### Post Management
1. **Post Feed with Pagination** — Retrieve posts with page/size parameters, default 10 per page
2. **Post Filtering** — Filter by post type (e.g., "Question", "Discussion", "Practice Partner") and industry
3. **Post Sorting** — Sort by creation date, updates, or engagement (upvotes)
4. **Full-Text Post Search** — Search across post titles, content, and tags
5. **Post CRUD** — Create, read, update, delete posts with validation
6. **Post Owner Protection** — Only post authors can edit/delete their own posts
7. **Post Upvoting/Downvoting** — Track engagement with upvote and downvote counts
8. **Post Reporting** — Flag inappropriate posts as reported

### Comment System
9. **Nested Comments** — Comments support threading via `parent_comment_id` field
10. **Comment CRUD** — Add, retrieve, delete comments with authorization checks
11. **Comment Upvoting** — Track comment engagement

### Follow System
12. **Follow/Unfollow Users** — Users can follow and unfollow other users
13. **Follower Lists** — Retrieve users following the current user
14. **Following Lists** — Retrieve users the current user is following
15. **Follow Status Check** — Query if a user follows another user
16. **Following Feed** — NEW: Get paginated posts only from users the current user follows

### Bookmarks (NEW — Module 6.2)
17. **Post Bookmarking** — NEW: Users can bookmark posts to save them for later
18. **Bookmark Toggle** — NEW: Single endpoint to toggle bookmark on/off with bookmark count returned
19. **Bookmark Management** — NEW: Query all bookmarked posts for the current user
20. **Bookmark Status Check** — NEW: Check if a specific post is bookmarked by the current user
21. **Bookmark Count** — NEW: Query total bookmarks on any post (publicly visible)

### Karma & Reputation
16. **Karma Points System** — Award karma for posts, comments, and upvotes received
17. **Karma Leaderboard** — Display top 10 users by total karma (publicly visible)
18. **User Karma Stats** — Query individual user karma and contribution counts

### User Profiles
22. **Community User Profile** — Aggregated view of user activity (posts, comments, karma, follower count)

### Security & Integration
23. **JWT Authentication** — Spring Security OAuth2 with Keycloak JWT tokens
24. **Role-Based Access** — Admin role (`ROLE_ADMIN`) for content deletion privileges
25. **Realm Role Extraction** — Extract roles from JWT's `realm_access` claim
26. **CORS Configuration** — Configured for Angular frontend at `localhost:4200`

---

## Angular Frontend Integration

The Community Service is consumed by the InterviewPrep TN Angular frontend at `localhost:4200`.

### Connected Pages & Components

- **`community.component.ts`** — Main community hub displaying the post feed with filtering, search, and pagination. Users can create posts, view comments, upvote/downvote, and follow other users from this page.

- **`user-profile.component.ts`** — User community profile page showing aggregated stats (karma, post count, comment count, follower count), user's recent posts, and a follow button. Links to the `/users/{keycloakId}/profile` endpoint.

### Key Angular Features Wired Up

- Real-time post feed with live upvote/downvote counts
- Search and filter UI connected to `/posts/search` and `/posts` with query parameters
- Comment threading UI for nested comment display
- Follow/unfollow buttons with follow status indicators
- Karma leaderboard display
- User profile cards with karma badges and follow relationships
- **NEW (M6.2):** 4-tab community page UI (All Posts | My Posts | Following | Bookmarks)
- **NEW (M6.2):** Bookmark toggle button on each post with visual indicator
- **NEW (M6.2):** Tab-specific empty state messages (e.g., "Follow some members to see their posts here")
- **NEW (M6.2):** Synchronized bookmark state across tabs

---

## How to Run Locally

### Prerequisites

- **Java 21** or higher (verify with `java -version`)
- **Maven 3.8+** (verify with `mvn -v`)
- **PostgreSQL 16+** running on `localhost:5432`
- **Keycloak** running on `http://localhost:8080` with realm `myapp-realm`
- **Realm Role** `ROLE_ADMIN` and test users configured in Keycloak

### Step 1: Create the Database

Connect to PostgreSQL and create the community service database:

```sql
CREATE DATABASE communitydb;
```

Verify the database was created:

```sql
\l
```

### Step 2: Configure Connection

Update `application.yaml` if your PostgreSQL password differs from the default:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/communitydb
    username: postgres
    password: "0000"  # Change if needed
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/myapp-realm
          jwk-set-uri: http://localhost:8080/realms/myapp-realm/protocol/openid-connect/certs
```

### Step 3: Run the Service

From the `community-service/` directory:

```bash
mvn clean install
mvn spring-boot:run
```

The service will:
1. Apply Flyway migrations (creating tables and indexes)
2. Start on `http://localhost:8086`
3. Validate database schema
4. Connect to Keycloak for JWT validation

### Verify the Service

Test the service with a public endpoint:

```bash
curl http://localhost:8086/api/community/posts
```

Expected response: `{"content":[],"totalElements":0,"totalPages":0,"number":0,"size":10}`

### Run with Docker (Available — Module 6.2)

A multi-stage Dockerfile and docker-compose integration are now available:

```bash
cd infra
docker-compose up -d
```

This will:
1. Create a `communitydb` PostgreSQL database
2. Build the community-service from the Dockerfile (multi-stage: Maven builder + Java runtime)
3. Start the service on port 8086
4. Apply all Flyway migrations automatically

**Note:** Ensure `user-service` is also running, as community-service depends on Keycloak which is managed through the main docker-compose file.

---

## Testing

All 23 API endpoints have been tested and validated using the **Yaak API client** with the following test users available in the Keycloak realm `myapp-realm`:

- **Test User 1:** keycloak_id = `user1`, roles: `ROLE_USER`
- **Test User 2:** keycloak_id = `user2`, roles: `ROLE_USER`
- **Admin User:** keycloak_id = `admin`, roles: `ROLE_ADMIN`, `ROLE_USER`

### Test Coverage

- ✅ Public endpoints (posts feed, search, leaderboard)
- ✅ Authenticated endpoints (create post, follow, comment)
- ✅ Owner-only operations (edit/delete own post/comment)
- ✅ Admin operations (delete any content)
- ✅ Pagination and filtering
- ✅ Nested comments with threading
- ✅ Upvote/downvote counts
- ✅ Karma point calculation
- ✅ Follow relationships
- ✅ User profile aggregation

---

## Security

### Public Endpoints
Users can access these endpoints without authentication:

- `GET /posts`
- `GET /posts/search`
- `GET /posts/{id}`
- `GET /posts/{id}/upvote`
- `GET /posts/{id}/downvote`
- `GET /posts/{id}/report`
- `GET /posts/{postId}/comments`
- `GET /comments/{id}/upvote`
- `GET /karma/leaderboard`
- `GET /karma/{keycloakId}`
- `GET /users/{keycloakId}/profile`

### Authenticated Endpoints
Requires valid JWT token from Keycloak:

- `POST /posts` — Create a new post
- `PUT /posts/{id}` — Update post (owner-only)
- `DELETE /posts/{id}` — Delete post (owner or admin)
- `POST /posts/{postId}/comments` — Add comment
- `DELETE /comments/{id}` — Delete comment (owner-only)
- `POST /follow/{targetKeycloakId}` — Follow a user
- `DELETE /follow/{targetKeycloakId}` — Unfollow a user
- `GET /follow/{keycloakId}/status` — Check follow status
- `GET /follow/followers` — Get followers
- `GET /follow/following` — Get following list
- `GET /karma/me` — Get own karma

### Authorization

- **Owner-Only Protection:** Users can only edit/delete their own posts and comments
- **Admin Override:** Users with `ROLE_ADMIN` can delete any content
- **JWT Validation:** All authentication via Keycloak OAuth2 JWT tokens with realm roles in `realm_access.roles` claim
- **Keycloak ID:** Cross-service identity uses `keycloakId` (extracted from JWT `sub` claim)

### CORS

CORS is configured to allow requests from the Angular frontend:

```
Allowed Origins: http://localhost:4200
Allowed Methods: GET, POST, PUT, DELETE
Allowed Headers: Content-Type, Authorization
```

---

## Flyway Migrations

Flyway automatically applies database migrations on startup. Migrations are stored in `src/main/resources/db/migration/`.

### V1__create_community_tables.sql

Initial schema with core tables:

- **posts** — Discussion posts with metadata and engagement metrics
- **comments** — Nested comments on posts with threading support
- **follows** — User follow relationships
- **Indexes** — Performance indexes on frequently queried columns

### V2__add_karma_table.sql

Adds the karma reputation system:

- **karma_scores** — Aggregated karma and contribution metrics per user
- **Indexes** — Fast lookups by keycloak_id and sorting by total karma

### V3__add_post_bookmarks.sql (NEW — Module 6.2)

Adds post bookmarking functionality:

- **post_bookmarks** — User bookmarks for saving favorite posts
- **Unique Constraint** — Prevents duplicate bookmarks (user_keycloak_id, post_id)
- **Indexes** — Fast lookups by user and post, with cascading delete on post removal

---

## Related Modules

### Dependencies

- **Module 1 (User Service):** Community Service depends on M1 for Keycloak integration and JWT validation. M1 manages user identities and authentication realms.

### Cross-Service Integration

- **Keycloak ID:** Both services use `keycloakId` (JWT `sub` claim) as the canonical user identifier
- **JWT Validation:** Community Service validates JWTs issued by the Keycloak realm configured in M1
- **No Direct DB Coupling:** Maintains microservice boundaries — no direct database queries to user-service. All identity checks use JWT claims.

### Architecture Notes

- Community Service is a **resource server** that trusts JWTs from Keycloak
- User-Service is the **identity provider** managing users and realms
- Services communicate via REST APIs and shared JWT standards
- Scalable design allows independent deployment and scaling

---

## Development Notes

### Code Structure

```
community-service/
├── src/main/
│   ├── java/com/microservice/community_service/
│   │   ├── controller/        # REST endpoints
│   │   ├── service/           # Business logic
│   │   ├── repository/        # JPA repositories
│   │   ├── entity/            # JPA entities
│   │   ├── dto/               # Request/Response DTOs
│   │   └── config/            # Security & CORS config
│   └── resources/
│       ├── application.yaml   # Configuration
│       └── db/migration/      # Flyway migrations
├── pom.xml                    # Maven dependencies
└── README.md                  # This file
```

### Build & Deploy

```bash
# Build the service
mvn clean package

# Run the JAR
java -jar target/community-service-0.0.1-SNAPSHOT.jar

# Run with specific profile (e.g., production)
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=prod"
```

### Extending the Service

To add new endpoints:

1. Create a new method in `CommunityService`
2. Add a corresponding endpoint in `CommunityController`
3. Create/update DTOs in the `dto/` package
4. Add tests using Yaak or similar API client
5. Update this README with new endpoint documentation

---

## Contact & Support

For questions or issues regarding the Community Service module, reach out to:

- **Developer:** Aziz Bnamoura
- **Module:** M6 — Community & Social
- **Project:** InterviewPrep TN

---

**Last Updated:** March 29, 2026 (M6.2 — Bookmarks & Following Feed)
**Service Version:** 0.0.1-SNAPSHOT
**Spring Boot Version:** 3.5.12
**Module:** M6 — Community Service (Fully Implemented)
