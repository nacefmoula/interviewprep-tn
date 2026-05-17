package com.microservice.userservice.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microservice.userservice.dto.CreateUserRequest;
import com.microservice.userservice.dto.UpdateUserRequest;
import com.microservice.userservice.dto.UserIdentityResponse;
import com.microservice.userservice.dto.UserResponse;
import com.microservice.userservice.enums.RoleEnum;
import com.microservice.userservice.enums.UserStatus;
import com.microservice.userservice.exception.UserAlreadyExistsException;
import com.microservice.userservice.exception.UserNotFoundException;
import com.microservice.userservice.mapper.UserMapper;
import com.microservice.userservice.messaging.producer.UserEventProducer;
import com.microservice.userservice.model.User;
import com.microservice.userservice.repository.UserRepository;

import org.springframework.security.oauth2.jwt.Jwt;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final UserEventProducer eventProducer;
    private final ObjectMapper objectMapper;
    private final CvStorageService cvStorageService;
    private final KeycloakAdminClient keycloakAdminClient;

    private final PdfTextExtractorService pdfTextExtractorService;
private final CvAiParsingService cvAiParsingService;
private final CvNormalizationService cvNormalizationService;
private final CvProfileEnrichmentService cvProfileEnrichmentService;

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Transactional
    public UserResponse create(CreateUserRequest request, String keycloakId) {
        log.info("Creating user with email: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException(
                "User with email " + request.getEmail() + " already exists");
        }

        if (userRepository.existsByKeycloakId(keycloakId)) {
            throw new UserAlreadyExistsException(
                "User with keycloakId " + keycloakId + " already exists");
        }

        User user = userMapper.toEntity(request);
        user.setKeycloakId(keycloakId);
        user.setRole(RoleEnum.USER);
        user.setStatus(UserStatus.PENDING_VERIFICATION);
        user.setSkillsJson(serializeSkills(request.getSkills()));

        User saved = userRepository.save(user);
        eventProducer.publishUserCreated(saved);

        log.info("User created successfully with id: {}", saved.getId());
        return toResponseWithSkills(saved);
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    @Cacheable(value = "users", key = "#id")
    public UserResponse findById(UUID id) {
        log.info("Cache MISS - fetching user from DB with id: {}", id);
        return userRepository.findById(id)
            .filter(u -> u.getDeletedAt() == null)
            .map(this::toResponseWithSkills)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with id: " + id));
    }

    @Cacheable(value = "users-by-keycloak", key = "#keycloakId")
    public UserResponse findByKeycloakId(String keycloakId) {
        log.info("Cache MISS - fetching user from DB with keycloakId: {}", keycloakId);
        return userRepository.findByKeycloakId(keycloakId)
            .filter(u -> u.getDeletedAt() == null)
            .map(this::toResponseWithSkills)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with keycloakId: " + keycloakId));
    }

    @Cacheable(value = "users-by-email", key = "#email")
    public UserResponse findByEmail(String email) {
        log.info("Cache MISS - fetching user from DB with email: {}", email);
        return userRepository.findByEmail(email)
            .filter(u -> u.getDeletedAt() == null)
            .map(this::toResponseWithSkills)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with email: " + email));
    }

    public Page<UserResponse> findAll(Pageable pageable) {
        return userRepository.findByDeletedAtIsNull(pageable)
            .map(this::toResponseWithSkills);
    }

    public Page<UserIdentityResponse> findAllIdentities(Pageable pageable) {
        return userRepository.findByDeletedAtIsNull(pageable)
            .map(userMapper::toIdentityResponse);
    }

    public Page<UserResponse> search(String query, Pageable pageable) {
        return userRepository.searchUsers(query, pageable)
            .map(this::toResponseWithSkills);
    }

    public Page<UserResponse> findByStatus(UserStatus status, Pageable pageable) {
        return userRepository.findByStatusAndDeletedAtIsNull(status, pageable)
            .map(this::toResponseWithSkills);
    }

    public Page<UserResponse> findByRole(RoleEnum role, Pageable pageable) {
        return userRepository.findByRoleAndDeletedAtIsNull(role, pageable)
            .map(this::toResponseWithSkills);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    @Transactional
    @Caching(
        put = { @CachePut(value = "users", key = "#id") },
        evict = {
            @CacheEvict(value = "users-by-keycloak", allEntries = true),
            @CacheEvict(value = "users-by-email", allEntries = true)
        }
    )
    public UserResponse update(UUID id, UpdateUserRequest request) {
        log.info("Updating user with id: {}", id);

        User user = userRepository.findById(id)
            .filter(u -> u.getDeletedAt() == null)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with id: " + id));

        userMapper.updateEntity(request, user);
        if (request.getSkills() != null) {
            user.setSkillsJson(serializeSkills(request.getSkills()));
        }
        User saved = userRepository.save(user);
        eventProducer.publishUserUpdated(saved);

        log.info("User updated successfully with id: {}", saved.getId());
        return toResponseWithSkills(saved);
    }

   @Transactional
@Caching(evict = {
    @CacheEvict(value = "users", allEntries = true),
    @CacheEvict(value = "users-by-keycloak", allEntries = true),
    @CacheEvict(value = "users-by-email", allEntries = true)
})
public UserResponse uploadCv(String keycloakId, MultipartFile file) {
    log.info("Uploading CV for user with keycloakId: {}", keycloakId);

    User user = userRepository.findByKeycloakId(keycloakId)
        .filter(u -> u.getDeletedAt() == null)
        .orElseThrow(() -> new UserNotFoundException(
            "User not found with keycloakId: " + keycloakId));

    String previousCvUrl = user.getCvUrl();
    String currentCvUrl = cvStorageService.storeCv(file, user.getId());

    user.setCvUrl(currentCvUrl);

    boolean parsingApplied = false;

    try {
        // ── Step 1: Extract text from PDF
        var extraction = pdfTextExtractorService.extractText(currentCvUrl);

        if (!extraction.isUsable()) {
            log.warn("CV text extraction too short or image-based — skipping AI parsing for user {}", user.getId());
        } else {
            String text = extraction.text();

            // ── Step 2: AI parsing via Ollama
            var parsed = cvAiParsingService.parse(text);

            // ── Step 3: Normalize
            var normalized = cvNormalizationService.normalize(parsed);

            // ── Step 4: Apply to user profile
            cvProfileEnrichmentService.applyToUser(user, normalized);

            parsingApplied = true;
            log.info("CV parsed and applied for user {} — skills={}, experiences={}, educations={}",
                user.getId(),
                normalized.getSkills().size(),
                normalized.getExperiences().size(),
                normalized.getEducations().size());
        }

    } catch (Exception ex) {
        // CV upload must NOT fail when AI parsing fails — log the full cause for debugging
        log.error("CV AI parsing failed for user {} — profile was not enriched: {}",
            user.getId(), ex.getMessage(), ex);
    }

    // ── Step 5: Save user
    User saved = userRepository.save(user);

    // ── Step 6: Cleanup old file
    cvStorageService.deleteOldCvIfManaged(previousCvUrl, currentCvUrl);

    // ── Step 7: Emit event
    eventProducer.publishUserUpdated(saved);

    UserResponse response = toResponseWithSkills(saved);
    response.setCvParsingApplied(parsingApplied);
    return response;
}

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "users-by-keycloak", allEntries = true),
        @CacheEvict(value = "users-by-email", allEntries = true)
    })
    public UserResponse updateRole(UUID id, RoleEnum newRole) {
        log.info("Updating role for user id: {} to {}", id, newRole);

        User user = userRepository.findById(id)
            .filter(u -> u.getDeletedAt() == null)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with id: " + id));

        user.setRole(newRole);
        User saved = userRepository.save(user);
        eventProducer.publishUserRoleChanged(saved);

        // Best-effort: keep Keycloak realm-role membership in sync so the user's
        // next JWT reflects the new role for @PreAuthorize checks across services.
        keycloakAdminClient.syncUserRealmRole(saved.getKeycloakId(), newRole);

        return toResponseWithSkills(saved);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "users-by-keycloak", allEntries = true),
        @CacheEvict(value = "users-by-email", allEntries = true)
    })
    public UserResponse updateStatus(UUID id, UserStatus newStatus) {
        log.info("Updating status for user id: {} to {}", id, newStatus);

        User user = userRepository.findById(id)
            .filter(u -> u.getDeletedAt() == null)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with id: " + id));

        user.setStatus(newStatus);
        User saved = userRepository.save(user);

        if (newStatus == UserStatus.SUSPENDED) {
            eventProducer.publishUserSuspended(saved);
        } else if (newStatus == UserStatus.ACTIVE && saved.getIsVerified()) {
            eventProducer.publishUserVerified(saved);
        }

        return toResponseWithSkills(saved);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "users-by-keycloak", allEntries = true),
        @CacheEvict(value = "users-by-email", allEntries = true)
    })
    public UserResponse verifyUser(UUID id) {
        log.info("Verifying user with id: {}", id);

        User user = userRepository.findById(id)
            .filter(u -> u.getDeletedAt() == null)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with id: " + id));

        user.setIsVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepository.save(user);
        eventProducer.publishUserVerified(saved);

        return toResponseWithSkills(saved);
    }

    @Transactional
    public void updateLastLogin(String keycloakId) {
        userRepository.findByKeycloakId(keycloakId).ifPresent(user -> {
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "users", allEntries = true),
        @CacheEvict(value = "users-by-keycloak", key = "#keycloakId"),
        @CacheEvict(value = "users-by-email", allEntries = true)
    })
    public void syncAdminRoleFromKeycloak(String keycloakId, boolean hasAdminRoleInKeycloak) {
        if (!hasAdminRoleInKeycloak) {
            return;
        }

        userRepository.findByKeycloakId(keycloakId)
            .filter(user -> user.getDeletedAt() == null)
            .filter(user -> user.getRole() != RoleEnum.ADMIN)
            .ifPresent(user -> {
                user.setRole(RoleEnum.ADMIN);
                User saved = userRepository.save(user);
                eventProducer.publishUserRoleChanged(saved);
                log.info("Synchronized Keycloak admin role for user id: {}", saved.getId());
            });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "users-by-keycloak", allEntries = true),
        @CacheEvict(value = "users-by-email", allEntries = true)
    })
    public void delete(UUID id) {
        log.info("Soft deleting user with id: {}", id);

        User user = userRepository.findById(id)
            .filter(u -> u.getDeletedAt() == null)
            .orElseThrow(() -> new UserNotFoundException(
                "User not found with id: " + id));

        user.setDeletedAt(LocalDateTime.now());
        user.setStatus(UserStatus.DELETED);
        User saved = userRepository.save(user);
        eventProducer.publishUserDeleted(saved);

        log.info("User soft deleted successfully with id: {}", id);
    }

    public Page<UserResponse> findDeleted(Pageable pageable) {
    return userRepository.findByDeletedAtIsNotNull(pageable)
        .map(this::toResponseWithSkills);
}

@Transactional
@Caching(evict = {
    @CacheEvict(value = "users", key = "#id"),
    @CacheEvict(value = "users-by-keycloak", allEntries = true),
    @CacheEvict(value = "users-by-email", allEntries = true)
})
public UserResponse restoreUser(UUID id) {
    log.info("Restoring user with id: {}", id);
    User user = userRepository.findById(id)
        .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
    user.setDeletedAt(null);
    user.setStatus(UserStatus.ACTIVE);
    User saved = userRepository.save(user);
    log.info("User restored successfully with id: {}", saved.getId());
    return toResponseWithSkills(saved);
}

private UserResponse toResponseWithSkills(User user) {
    UserResponse response = userMapper.toResponse(user);
    response.setSkills(deserializeSkills(user.getSkillsJson()));
    return response;
}

private String serializeSkills(List<String> skills) {
    if (skills == null || skills.isEmpty()) {
        return null;
    }

    List<String> normalizedSkills = skills.stream()
        .filter(skill -> skill != null && !skill.isBlank())
        .map(String::trim)
        .distinct()
        .collect(Collectors.toList());

    if (normalizedSkills.isEmpty()) {
        return null;
    }

    try {
        return objectMapper.writeValueAsString(normalizedSkills);
    } catch (IOException exception) {
        log.warn("Failed to serialize skills", exception);
        return null;
    }
}

private List<String> deserializeSkills(String skillsJson) {
    if (skillsJson == null || skillsJson.isBlank()) {
        return List.of();
    }

    try {
        return objectMapper.readValue(skillsJson, new TypeReference<List<String>>() {});
    } catch (IOException exception) {
        log.warn("Failed to deserialize skills for payload", exception);
        return List.of();
    }
}

@Transactional
@Caching(evict = {
    @CacheEvict(value = "users-by-keycloak", key = "#jwt.subject"),
    @CacheEvict(value = "users-by-email", allEntries = true)
})
// ── Replace findOrProvisionFromJwt in UserService.java with this version ──

public UserResponse findOrProvisionFromJwt(Jwt jwt) {
    String keycloakId = jwt.getSubject();
    String email      = jwt.getClaimAsString("email");

    // 1. Already exists → update lastLogin, sync passkey status, and return
    Optional<User> existing = userRepository.findByKeycloakId(keycloakId)
            .filter(u -> u.getDeletedAt() == null);
    if (existing.isPresent()) {
        User u = existing.get();
        u.setLastLoginAt(LocalDateTime.now());
        syncPasskeyStatus(u, jwt);                          // ← NEW
        return toResponseWithSkills(userRepository.save(u));
    }

    // 2. Same email but different keycloakId (edge: account linking race)
    //    → re-key to the new sub so we don't create a duplicate
    if (email != null) {
        Optional<User> byEmail = userRepository.findByEmail(email)
                .filter(u -> u.getDeletedAt() == null);
        if (byEmail.isPresent()) {
            User u = byEmail.get();
            u.setKeycloakId(keycloakId);
            u.setLastLoginAt(LocalDateTime.now());
            syncPasskeyStatus(u, jwt);                      // ← NEW
            log.info("Re-linked existing user {} to new keycloakId {}", u.getId(), keycloakId);
            return toResponseWithSkills(userRepository.save(u));
        }
    }

    // 3. Brand-new social user → auto-create
    User user = User.builder()
            .keycloakId(keycloakId)
            .email(email != null ? email : keycloakId + "@social.local")
            .firstName(jwt.getClaimAsString("given_name"))
            .lastName(jwt.getClaimAsString("family_name"))
            .role(RoleEnum.USER)
            .status(UserStatus.PENDING_VERIFICATION)
            .lastLoginAt(LocalDateTime.now())
            .build();

    User saved = userRepository.save(user);
    eventProducer.publishUserCreated(saved);
    log.info("Auto-provisioned social user {} from keycloakId {}", saved.getId(), keycloakId);
    return toResponseWithSkills(saved);
}

// ── NEW: sync passkey flag from JWT ACR claim ──────────────────────────────
// Keycloak sets acr = "webauthn-passwordless" when user authenticates via passkey.
// We record this as a UI hint only — Keycloak remains the auth source of truth.
private void syncPasskeyStatus(User user, Jwt jwt) {
    String acr = jwt.getClaimAsString("acr");
    boolean authenticatedViaPasskey = acr != null &&
            (acr.equals("webauthn-passwordless") || acr.contains("webauthn"));

    if (authenticatedViaPasskey && !Boolean.TRUE.equals(user.getPasskeyRegistered())) {
        user.setPasskeyRegistered(true);
        user.setPasskeyRegisteredAt(LocalDateTime.now());
        log.info("Passkey registered recorded for user {}", user.getId());
    }
}
}