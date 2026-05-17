package com.microservice.mentorshipservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

/**
 * Hermetic unit test for the I5 canonical role normalization. Regression
 * guard for the prior bug where role case was kept as-is, so a lowercase
 * "admin" claim never matched hasRole('ADMIN'). No context/DB/Docker.
 */
class JwtRoleConverterTest {

    private Set<String> authorities(Map<String, Object> realmAccess) {
        JwtAuthenticationConverter converter = new SecurityConfig().jwtAuthenticationConverter();
        Jwt.Builder b = Jwt.withTokenValue("t").header("alg", "none").subject("u1");
        if (realmAccess != null) {
            b.claim("realm_access", realmAccess);
        } else {
            b.claim("scope", "openid");
        }
        AbstractAuthenticationToken token = converter.convert(b.build());
        return token.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }

    @Test
    void lowercase_admin_becomes_ROLE_ADMIN() {
        assertThat(authorities(Map.of("roles", List.of("admin", "  mentor  "))))
                .containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_MENTOR");
    }

    @Test
    void does_not_double_prefix_already_prefixed_roles() {
        assertThat(authorities(Map.of("roles", List.of("ROLE_admin"))))
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void filters_blank_and_non_string_entries() {
        Map<String, Object> realm = new HashMap<>();
        realm.put("roles", Arrays.asList("user", "", "   ", 7));
        assertThat(authorities(realm)).containsExactly("ROLE_USER");
    }

    @Test
    void no_realm_access_yields_no_authorities() {
        assertThat(authorities(null)).isEmpty();
    }
}
