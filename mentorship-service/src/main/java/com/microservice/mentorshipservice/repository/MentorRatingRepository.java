package com.microservice.mentorshipservice.repository;

import com.microservice.mentorshipservice.entities.MentorRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MentorRatingRepository extends JpaRepository<MentorRating, UUID> {

    List<MentorRating> findByMentorId(UUID mentorId);

    List<MentorRating> findByMenteeId(UUID menteeId);

    Optional<MentorRating> findByMenteeIdAndMentorId(UUID menteeId, UUID mentorId);

    @Query("SELECT COUNT(r) FROM MentorRating r WHERE r.mentorId = :mentorId")
    long countByMentorId(UUID mentorId);

    @Query("SELECT AVG(r.stars) FROM MentorRating r WHERE r.mentorId = :mentorId")
    Double avgStarsByMentorId(UUID mentorId);

    void deleteBySessionId(UUID sessionId);

    void deleteBySessionIdIn(List<UUID> sessionIds);

    void deleteByMenteeIdAndMentorId(UUID menteeId, UUID mentorId);
}