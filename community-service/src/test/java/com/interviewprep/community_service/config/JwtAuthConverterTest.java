package com.interviewprep.community_service.config;

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
 * Hermetic unit test for the I5 canonical role normalization. Regression
 * guard for the prior bug where ROLE_ was always prepended, so a
 * "ROLE_ADMIN" realm claim became "ROLE_ROLE_ADMIN" and never matched.
 */
class JwtAuthConverterTest {

    private final JwtAuthConverter converter = new JwtAuthConverter();

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
    void already_prefixed_role_is_not_double_prefixed() {
        Set<String> a = authorities(Map.of("roles", List.of("ROLE_ADMIN")));
        assertThat(a).containsExactly("ROLE_ADMIN");
        assertThat(a).doesNotContain("ROLE_ROLE_ADMIN");
    }

    @Test
    void normalizes_case_and_trims() {
        assertThat(authorities(Map.of("roles", List.of("admin", "  user  "))))
                .containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_USER");
    }

    @Test
    void filters_blank_and_non_string_entries() {
        Map<String, Object> realm = new HashMap<>();
        realm.put("roles", Arrays.asList("admin", "", "  ", 1));
        assertThat(authorities(realm)).containsExactly("ROLE_ADMIN");
    }

    @Test
    void no_realm_access_yields_no_authorities() {
        assertThat(authorities(null)).isEmpty();
    }
}
