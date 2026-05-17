package com.microservice.mentorshipservice.repository;
import com.microservice.mentorshipservice.entities.MentorRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MentorRequestRepository extends JpaRepository<MentorRequest, UUID> {

    List<MentorRequest> findByMenteeId(UUID menteeId);
    List<MentorRequest> findByMentorId(UUID mentorId);
}
