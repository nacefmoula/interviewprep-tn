import { Injectable } from "@angular/core";
import Keycloak from "keycloak-js";
import { environment } from "../../../environments/environment";
import type { JwtClaims } from "./jwt-claims";

@Injectable({ providedIn: "root" })
export class AuthService {
    private keycloak: Keycloak;
    private initialized = false;
    private tokenRefreshInFlight: Promise<string> | null = null;
    private readonly tokenRefreshTimeoutMs = 3000;

    constructor() {
        this.keycloak = new Keycloak({
            url: environment.keycloak.url,
            realm: environment.keycloak.realm,
            clientId: environment.keycloak.clientId,
        });
    }

    async init(): Promise<boolean> {
        try {
            const authenticated = await this.keycloak.init({
                onLoad: "check-sso",
                silentCheckSsoRedirectUri:
                    window.location.origin + "/assets/silent-check-sso.html",
                pkceMethod: "S256",
                checkLoginIframe: false,
            });

            this.initialized = true;
            return authenticated;
        } catch (error) {
            console.error("Keycloak init error:", error);
            this.initialized = true;
            return false;
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    login(redirectPath?: string): void {
        // Only accept an in-app absolute path ("/x"); reject protocol-relative
        // ("//evil.com") and absolute URLs to prevent open-redirect.
        const safePath =
            redirectPath &&
            redirectPath.startsWith("/") &&
            !redirectPath.startsWith("//")
                ? redirectPath
                : "/dashboard";
        this.keycloak.login({
            redirectUri: window.location.origin + safePath,
        });
    }

    register(): void {
        this.keycloak.register({
            redirectUri: window.location.origin + "/complete-profile",
        });
    }

    logout(): void {
        this.keycloak.logout({
            redirectUri: window.location.origin,
        });
    }

    // ── Passkey: trigger Keycloak's WebAuthn registration for logged-in user ──
    registerPasskey(): void {
        const accountUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/account`;
        // Redirect to Keycloak account console → Security → Signing In
        // where the user can register a passkey under "Passwordless"
        window.location.href = accountUrl + "/#/security/signing-in";
    }

    // ── Passkey: trigger via Application Initiated Action (AIA) ──
    registerPasskeyViaAIA(): void {
        this.keycloak.login({
            action: "webauthn-register-passwordless",
            redirectUri: window.location.origin + "/dashboard",
        });
    }

    // ── Passkey login entry point ──
    loginWithPasskey(): void {
        // Keycloak's browser-passkey flow handles routing to WebAuthn authenticator
        this.keycloak.login({
            redirectUri: window.location.origin + "/dashboard",
        });
    }

    isAuthenticated(): boolean {
        return !!this.keycloak.authenticated;
    }

    getToken(): Promise<string> {
        const existingToken = this.keycloak.token || "";

        if (!this.initialized) {
            return Promise.resolve(existingToken);
        }
        if (!this.isAuthenticated()) {
            return Promise.resolve("");
        }

        // If we already have a token, don't block the request waiting for refresh.
        // Kick off refresh in background and return the current token immediately.
        if (existingToken) {
            if (!this.tokenRefreshInFlight) {
                this.tokenRefreshInFlight = this.keycloak
                    .updateToken(30)
                    .then(() => this.keycloak.token || existingToken)
                    .catch((err) => {
                        console.warn("Keycloak updateToken failed; using existing token", err);
                        return this.keycloak.token || existingToken;
                    })
                    .finally(() => {
                        this.tokenRefreshInFlight = null;
                    });
            }
            return Promise.resolve(existingToken);
        }

        // No token yet: attempt a refresh, but never hang forever.
        if (this.tokenRefreshInFlight) {
            return this.tokenRefreshInFlight;
        }

        const refreshPromise = this.keycloak
            .updateToken(30)
            .then(() => this.keycloak.token || "")
            .catch((err) => {
                console.warn("Keycloak updateToken failed; no token available", err);
                return this.keycloak.token || "";
            });

        this.tokenRefreshInFlight = Promise.race([
            refreshPromise,
            new Promise<string>((resolve) => {
                window.setTimeout(() => resolve(""), this.tokenRefreshTimeoutMs);
            }),
        ]).finally(() => {
            this.tokenRefreshInFlight = null;
        });

        return this.tokenRefreshInFlight;
    }

    /** Single typed boundary over keycloak-js's loosely-typed token. */
    private get claims(): JwtClaims | undefined {
        return this.keycloak.tokenParsed as JwtClaims | undefined;
    }

    getTokenParsed(): JwtClaims | undefined {
        return this.claims;
    }

    getUserRoles(): string[] {
        const claims = this.claims;

        const realmRoles: string[] = claims?.realm_access?.roles ?? [];

        const resourceAccess = claims?.resource_access ?? {};
        const resourceRoles: string[] = Object.values(resourceAccess)
            .flatMap((client) => client?.roles ?? []);

        // De-dupe, keep as-is (callers can normalize case)
        return Array.from(new Set([...realmRoles, ...resourceRoles]));
    }

    hasRole(role: string): boolean {
        const roles = this.getUserRoles().map((r) => String(r).toUpperCase());
        const target = String(role || "").toUpperCase();

        if (!target) return false;
        if (roles.includes(target)) return true;

        // Normalize ROLE_ prefix differences (Keycloak often returns roles without ROLE_)
        if (target.startsWith("ROLE_")) {
            return roles.includes(target.substring("ROLE_".length));
        }

        return roles.includes(`ROLE_${target}`);
    }

    getKeycloakId(): string {
        return this.claims?.sub ?? "";
    }

    getEmail(): string {
        return this.claims?.email ?? "";
    }

    getFullName(): string {
        return this.claims?.name ?? "";
    }

    getFirstName(): string {
        return this.claims?.given_name ?? "";
    }

    getLastName(): string {
        return this.claims?.family_name ?? "";
    }

    // ── Check if user authenticated via passkey (acr claim) ──
    isPasskeyAuthenticated(): boolean {
        const acr = this.claims?.acr;
        return acr === "webauthn-passwordless" || acr === "webauthn";
    }

    loginWithGoogle(): void {
        this.keycloak.login({
            idpHint: "google",
            redirectUri: window.location.origin + "/dashboard",
        });
    }

    loginWithLinkedIn(): void {
        this.keycloak.login({
            idpHint: "linkedin-openid-connect",
            redirectUri: window.location.origin + "/dashboard",
        });
    }

    loginWithGitHub(): void {
        this.keycloak.login({
            idpHint: "github",
            redirectUri: window.location.origin + "/dashboard",
        });
    }
}
