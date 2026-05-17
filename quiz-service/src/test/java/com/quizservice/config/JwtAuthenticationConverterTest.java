package com.quizservice.config;

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

/**
 * Hermetic unit test for the I5 canonical role normalization (trim +
 * UPPERCASE + single ROLE_ prefix, null/blank-safe). No context/DB/Docker.
 */
class JwtAuthenticationConverterTest {

    private final JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

    private Set<String> authorities(Map<String, Object> realmAccess) {
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
    void normalizes_case_trims_and_prefixes() {
        assertThat(authorities(Map.of("roles", List.of("admin", "  user  ", "ROLE_manager"))))
                .containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_USER", "ROLE_MANAGER");
    }

    @Test
    void filters_blank_and_non_string_entries() {
        Map<String, Object> realm = new HashMap<>();
        realm.put("roles", Arrays.asList("admin", "", "   ", 99));
        assertThat(authorities(realm)).containsExactly("ROLE_ADMIN");
    }

    @Test
    void no_realm_access_yields_no_authorities() {
        assertThat(authorities(null)).isEmpty();
    }
}
