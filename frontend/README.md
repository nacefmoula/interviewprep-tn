# InterviewPrepTN Frontend — Angular 21

## Overview
Angular 21 frontend for the InterviewPrep TN platform, integrated with Keycloak for authentication and the User Microservice API.

---

## Tech Stack
- Angular 21 (standalone components)
- Keycloak-Angular 21 + Keycloak-JS 26
- TypeScript 5.9
- SCSS / CSS Variables design system

---

## Prerequisites
- Node.js 22+
- npm 10+
- Angular CLI 21 (`npm install -g @angular/cli`)
- Backend running at `http://localhost:8081`
- Keycloak running at `http://localhost:8080`
- Infrastructure started (see `/infra/README.md`)

---

## Quick Start

### 1 — Install dependencies
```bash
cd frontend
npm install
```

### 2 — Start the infrastructure first
```bash
cd ../infra
cp .env.example .env
docker compose up -d
```
Wait 90 seconds for Keycloak to fully start.

### 3 — Start the Spring Boot backend
```bash
cd ../user-service
mvn spring-boot:run
```

### 4 — Start the Angular app
```bash
cd ../frontend
ng serve --port 4200
```

Open `http://localhost:4200`

---

## Project Structure
```
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth.service.ts          ← Keycloak wrapper
│   │   │   └── auth.guard.ts            ← Route protection
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts      ← Auto-attach JWT to API calls
│   │   └── services/
│   │       └── user-api.service.ts      ← HTTP calls to Spring Boot
│   ├── layout/
│   │   ├── shell/shell.component.ts     ← Main app shell
│   │   ├── sidebar/sidebar.component.ts ← Navigation sidebar (real user data)
│   │   └── topbar/topbar.component.ts   ← Top bar (real user data + logout)
│   ├── pages/
│   │   ├── landing/                     ← Public landing page
│   │   ├── complete-profile/            ← Post-registration form
│   │   ├── dashboard/                   ← Dashboard + Admin Panel tab
│   │   ├── profile/                     ← User profile (real data + edit)
│   │   ├── admin/                       ← Admin dashboard component
│   │   └── ...                          ← Other pages (mock data for now)
│   └── app.routes.ts                    ← Routes with auth guards
├── assets/
│   └── silent-check-sso.html            ← Required for Keycloak SSO
└── environments/
    └── environment.ts                   ← API URLs config
```

---

## Authentication Flow
```
User clicks Login/Register
        ↓
Redirected to Keycloak (custom InterviewPrepTN theme)
        ↓
User logs in / registers
        ↓
New user → redirected to /complete-profile
        ↓
User fills profile → POST /api/users/register
        ↓
Redirected to /dashboard
        ↓
All API calls automatically include JWT via interceptor
```

---

## Key Files to Know

### auth.service.ts
Wraps Keycloak. Use these methods anywhere:
```typescript
authService.login()           // redirect to Keycloak login
authService.register()        // redirect to Keycloak register
authService.logout()          // logout and redirect to landing
authService.isAuthenticated() // boolean
authService.getToken()        // Promise<string> — JWT token
authService.getKeycloakId()   // string — user's Keycloak sub
authService.getEmail()        // string
authService.getFullName()     // string
authService.hasRole('ROLE_ADMIN') // boolean
```

### auth.guard.ts
Protects routes. Add to any route:
```typescript
{ path: 'dashboard', canActivate: [authGuard], ... }
```

### auth.interceptor.ts
Automatically adds `Authorization: Bearer <token>` to every HTTP request. No manual setup needed.

### environment.ts
```typescript
export const environment = {
  apiUrl: 'http://localhost:8081',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'myapp-realm',
    clientId: 'angular-client'
  }
};
```

---

## Pages Status

| Page | Status | Data Source |
|------|--------|-------------|
| Landing | ✅ Done | Static + Keycloak buttons |
| Complete Profile | ✅ Done | POST /api/users/register |
| Dashboard | ✅ Done | Mock + Admin Panel tab |
| Profile | ✅ Done | GET/PUT /api/users/me |
| Admin Panel | ✅ Done | Full CRUD /api/users/** |
| Interviews | 🔲 Mock | Waiting for Member 2 |
| Quiz & Assess | 🔲 Mock | Waiting for Member 3 |
| Training | 🔲 Mock | Waiting for Member 4 |
| Reports | 🔲 Mock | Waiting for Member 2 |
| Mentorship | 🔲 Mock | Waiting for Member 5 |
| Community | 🔲 Mock | Waiting for Member 6 |
| Library | 🔲 Mock | Waiting for Member 7 |

---

## Admin Panel
Accessible to users with `ROLE_ADMIN` only.
- Go to Dashboard → click **Admin Panel** tab
- Features: list users, search, filter by status/role, verify, suspend, activate, delete, restore, view full details

To make a user admin:
1. Go to `http://localhost:8080` → Admin Console → myapp-realm → Users
2. Click the user → Role mapping → Assign role → ROLE_ADMIN
3. User must log out and log back in for the role to take effect

---

## Keycloak Theme
Custom InterviewPrepTN theme located at `/infra/keycloak/themes/interv/`.
- Light mode, matches InterviewPrepTN design system
- Custom login and register pages
- Deployed to Keycloak container automatically on docker compose up

To redeploy theme manually:
```bash
docker cp infra/keycloak/themes/interv userservice-keycloak:/opt/keycloak/themes/
docker restart userservice-keycloak
```

---

## Adding a New Page (for other members)

1. Create your component in `src/app/pages/your-module/`
2. Add route in `app.routes.ts`:
```typescript
{ path: 'your-route', loadComponent: () => import('./pages/your-module/your.component').then(m => m.YourComponent) }
```
3. Add nav item in `sidebar.component.ts` if needed
4. Use `HttpClient` with the auth interceptor — JWT is added automatically
5. Use `AuthService` to get current user info

---

## Common Issues

**Profile shows "Loading your profile..." forever**
→ Spring Boot is not running. Start it: `cd user-service && mvn spring-boot:run`

**Redirected to /complete-profile every time**
→ Your Keycloak account exists but you have no record in the database. Submit the complete-profile form to create one.

**401 Unauthorized on API calls**
→ Your JWT token expired. Log out and log back in.

**Keycloak login page shows error**
→ Keycloak container is not healthy. Wait 90 seconds after `docker compose up -d`.

**Cannot connect to server (status 0)**
→ CORS issue or Spring Boot not running. Check `http://localhost:8081/actuator/health`.
