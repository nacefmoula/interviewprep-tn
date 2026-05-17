package com.microservice.mentorshipservice.repository;

import com.microservice.mentorshipservice.entities.MentorSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MentorSessionRepository extends JpaRepository<MentorSession, UUID> {
    List<MentorSession> findByRequestId(UUID requestId);

    void deleteByRequestId(UUID requestId);
}
