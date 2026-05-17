import type { KeycloakTokenParsed } from 'keycloak-js';

/**
 * Strongly-typed view of the Keycloak access-token claims this app reads.
 *
 * `KeycloakTokenParsed` carries a loose `[key: string]: any` index signature
 * and omits the OIDC profile claims, so reading them was untyped `any` (F5).
 * This adds the profile claims; `sub`, `acr`, `realm_access` and
 * `resource_access` are inherited (already typed by keycloak-js).
 */
export interface JwtClaims extends KeycloakTokenParsed {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}
