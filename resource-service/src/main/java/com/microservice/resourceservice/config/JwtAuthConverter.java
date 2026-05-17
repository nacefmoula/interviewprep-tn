package com.microservice.resourceservice.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null) {
            return authorities;
        }

        Object rolesObj = realmAccess.get("roles");
        if (!(rolesObj instanceof List<?> roles)) {
            return authorities;
        }

        for (Object role : roles) {
            if (role instanceof String roleName) {
                String normalized = roleName.trim().toUpperCase();
                if (!normalized.isBlank()) {
                    String authority = normalized.startsWith("ROLE_") ? normalized : "ROLE_" + normalized;
                    authorities.add(new SimpleGrantedAuthority(authority));
                }
            }
        }

        return authorities;
    }
}
