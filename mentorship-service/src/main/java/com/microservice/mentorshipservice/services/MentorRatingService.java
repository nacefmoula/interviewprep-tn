package com.microservice.mentorshipservice.services;

import com.microservice.mentorshipservice.DTOs.MentorStatsDTO;
import com.microservice.mentorshipservice.DTOs.RatingRequestDTO;
import com.microservice.mentorshipservice.entities.MentorRating;
import com.microservice.mentorshipservice.enums.MentorStatus;
import com.microservice.mentorshipservice.enums.SessionStatus;
import com.microservice.mentorshipservice.repository.MentorRatingRepository;
import com.microservice.mentorshipservice.repository.MentorRequestRepository;
import com.microservice.mentorshipservice.repository.MentorSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MentorRatingService {

    @Autowired private MentorRatingRepository ratingRepository;
    @Autowired private MentorSessionRepository sessionRepository;
    @Autowired private MentorRequestRepository requestRepository;

    public MentorRating rateMentor(UUID menteeId, UUID mentorId, RatingRequestDTO dto) {
        // validate stars range
        if (dto.getStars() < 1 || dto.getStars() > 5) {
            throw new RuntimeException("Stars must be between 1 and 5");
        }

        // One rating per mentee+mentor, but allow editing by upserting.
        Optional<MentorRating> existing = ratingRepository.findByMenteeIdAndMentorId(menteeId, mentorId);
        MentorRating rating = existing.orElseGet(MentorRating::new);
        rating.setMenteeId(menteeId);
        rating.setMentorId(mentorId);
        rating.setStars(dto.getStars());
        rating.setComment(dto.getComment());
        // sessionId is optional (can be null). If provided, store/overwrite it.
        if (dto.getSessionId() != null) {
            rating.setSessionId(dto.getSessionId());
        }

        return ratingRepository.save(rating);
    }

    public void unrateMentor(UUID menteeId, UUID mentorId) {
        ratingRepository.deleteByMenteeIdAndMentorId(menteeId, mentorId);
    }

    public List<MentorRating> getMyRatings(UUID menteeId) {
        return ratingRepository.findByMenteeId(menteeId);
    }

    public MentorStatsDTO getMentorStats(UUID mentorId) {
        // count completed sessions
        long completedSessions = requestRepository.findByMentorId(mentorId)
            .stream()
            .filter(r -> r.getStatus() == MentorStatus.ACCEPTED)
            .flatMap(r -> sessionRepository.findByRequestId(r.getId()).stream())
            .filter(s -> s.getStatus() == SessionStatus.COMPLETED)
            .count();

        Double avg = ratingRepository.avgStarsByMentorId(mentorId);
        long totalRatings = ratingRepository.countByMentorId(mentorId);

        return new MentorStatsDTO(
            completedSessions,
            avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
            totalRatings
        );
    }
}