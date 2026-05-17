package com.microservice.mentorshipservice.services;

import com.microservice.mentorshipservice.DTOs.MentorRequestDTO;
import com.microservice.mentorshipservice.DTOs.MentorRequestResponseDTO;
import com.microservice.mentorshipservice.DTOs.UserResponse;
import com.microservice.mentorshipservice.clients.UserServiceClient;
import com.microservice.mentorshipservice.entities.MentorRequest;
import com.microservice.mentorshipservice.enums.MentorStatus;
import com.microservice.mentorshipservice.repository.MentorRequestRepository;
import com.microservice.mentorshipservice.repository.MentorRatingRepository;
import com.microservice.mentorshipservice.repository.MentorSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MentorRequestService {

    @Autowired
    private MentorRequestRepository repository;

    @Autowired
    private MentorSessionRepository sessionRepository;

    @Autowired
    private MentorRatingRepository ratingRepository;

    @Autowired
    private UserServiceClient userServiceClient;

    // CREATE
    public MentorRequestResponseDTO createRequest(MentorRequestDTO dto, UUID menteeId) {
        // 1. Self-request guard
        if (menteeId.equals(dto.getMentorId())) {
            throw new RuntimeException("Cannot request mentorship from yourself");
        }

        // 2. Duplicate check
        boolean exists = repository.findByMenteeId(menteeId)
                .stream()
                .anyMatch(r -> r.getMentorId().equals(dto.getMentorId())
                        && r.getStatus() == MentorStatus.PENDING);
        if (exists) {
            throw new RuntimeException("A pending request to this mentor already exists");
        }

        // 3. REMOVE the Feign validation block — user service doesn't support keycloak ID lookup
        // The mentorId is the Keycloak UUID coming from the token, trust it for now

        // 4. Build and save
        MentorRequest request = new MentorRequest();
        request.setMentorId(dto.getMentorId());
        request.setMenteeId(menteeId);
        request.setStatus(MentorStatus.PENDING);
        return toDTO(repository.save(request));
    }    // READ
    public List<MentorRequestResponseDTO> getRequestsByMentee(UUID menteeId) {
        return repository.findByMenteeId(menteeId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<MentorRequestResponseDTO> getRequestsByMentor(UUID mentorId) {
        return repository.findByMentorId(mentorId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<MentorRequestResponseDTO> getAllRequests() {
        return repository.findAll()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // UPDATE (ACCEPT)
    public MentorRequestResponseDTO acceptRequest(UUID id) {
        MentorRequest request = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (request.getStatus() != MentorStatus.PENDING) {
            throw new RuntimeException("Request is not in pending status");
        }
        request.setStatus(MentorStatus.ACCEPTED);
        return toDTO(repository.save(request));
        // session creation is now the mentor's explicit action via MentorSessionController POST
    }
    // UPDATE (DECLINE)
    public MentorRequestResponseDTO declineRequest(UUID id) {
        MentorRequest request = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        if (request.getStatus() != MentorStatus.PENDING) {
            throw new RuntimeException("Request is not in pending status");
        }
        request.setStatus(MentorStatus.DECLINED);
        return toDTO(repository.save(request));
    }

    // DELETE
    @Transactional
    public void deleteRequest(UUID id) {
        // delete mentor_ratings -> sessions -> request (order matters if DB has FKs)
        List<UUID> sessionIds = sessionRepository.findByRequestId(id)
                .stream()
                .map(s -> s.getId())
                .collect(Collectors.toList());

        if (!sessionIds.isEmpty()) {
            ratingRepository.deleteBySessionIdIn(sessionIds);
        }

        sessionRepository.deleteByRequestId(id);
        repository.deleteById(id);
    }

    // mapper — private helper
    private MentorRequestResponseDTO toDTO(MentorRequest r) {
        MentorRequestResponseDTO dto = new MentorRequestResponseDTO();
        dto.setId(r.getId());
        dto.setMentorId(r.getMentorId());
        dto.setMenteeId(r.getMenteeId());
        dto.setStatus(r.getStatus().name());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
