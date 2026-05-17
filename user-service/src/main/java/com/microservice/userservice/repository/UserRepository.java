package com.microservice.userservice.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.microservice.userservice.enums.RoleEnum;
import com.microservice.userservice.enums.UserStatus;
import com.microservice.userservice.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByKeycloakId(String keycloakId);

    boolean existsByEmail(String email);

    boolean existsByKeycloakId(String keycloakId);

    Page<User> findByDeletedAtIsNull(Pageable pageable);

    Page<User> findByStatusAndDeletedAtIsNull(
            UserStatus status, Pageable pageable);

    Page<User> findByRoleAndDeletedAtIsNull(
            RoleEnum role, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND " +
           "(LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsers(
            @Param("search") String search, Pageable pageable);
    Page<User> findByDeletedAtIsNotNull(Pageable pageable);
}
