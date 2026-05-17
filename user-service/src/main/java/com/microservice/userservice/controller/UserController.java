package com.microservice.userservice.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.microservice.userservice.dto.CreateUserRequest;
import com.microservice.userservice.dto.UpdateUserRequest;
import com.microservice.userservice.dto.UserIdentityResponse;
import com.microservice.userservice.dto.UserResponse;
import com.microservice.userservice.enums.RoleEnum;
import com.microservice.userservice.enums.UserStatus;
import com.microservice.userservice.service.AvatarStorageService;
import com.microservice.userservice.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AvatarStorageService avatarStorageService;

    // ── PUBLIC ────────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserResponse response = userService.create(request, jwt.getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── CURRENT USER ──────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(userService.findOrProvisionFromJwt(jwt));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserResponse current = userService.findOrProvisionFromJwt(jwt);
        return ResponseEntity.ok(
            userService.update(current.getId(), request));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<java.util.Map<String, String>> uploadAvatar(
            @RequestParam("file") MultipartFile file) {
        String storedPath = avatarStorageService.storeAvatar(file);
        String publicUrl = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path(storedPath)
                .toUriString();

        return ResponseEntity.ok(java.util.Map.of("url", publicUrl));
    }

    @PostMapping("/me/cv")
    public ResponseEntity<UserResponse> uploadCv(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(userService.uploadCv(jwt.getSubject(), file));
    }

    // ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(Pageable pageable) {
        return ResponseEntity.ok(userService.findAll(pageable));
    }

    @GetMapping("/identities")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Page<UserIdentityResponse>> getAllUserIdentities(Pageable pageable) {
        return ResponseEntity.ok(userService.findAllIdentities(pageable));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Page<UserResponse>> searchUsers(
            @RequestParam String query,
            Pageable pageable) {
        return ResponseEntity.ok(userService.search(query, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or @userSecurity.isOwner(authentication, #id)")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or @userSecurity.isOwner(authentication, #id)")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable UUID id,
            @RequestParam RoleEnum role) {
        return ResponseEntity.ok(userService.updateRole(id, role));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam UserStatus status) {
        return ResponseEntity.ok(userService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Page<UserResponse>> getUsersByStatus(
            @RequestParam UserStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(userService.findByStatus(status, pageable));
    }

    @GetMapping("/by-role")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<UserResponse>> getUsersByRole(
            @RequestParam RoleEnum role,
            Pageable pageable) {
        return ResponseEntity.ok(userService.findByRole(role, pageable));
    }

    @PatchMapping("/{id}/verify")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<UserResponse> verifyUser(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.verifyUser(id));
    }
    @GetMapping("/deleted")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public ResponseEntity<Page<UserResponse>> getDeletedUsers(Pageable pageable) {
    return ResponseEntity.ok(userService.findDeleted(pageable));
}

@PatchMapping("/{id}/restore")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public ResponseEntity<UserResponse> restoreUser(@PathVariable UUID id) {
    return ResponseEntity.ok(userService.restoreUser(id));
}

@PatchMapping("/{id}/availability")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<UserResponse> toggleAvailability(
        @PathVariable UUID id,
        @RequestParam UserStatus status) {
    return ResponseEntity.ok(userService.updateStatus(id, status));
}
}
