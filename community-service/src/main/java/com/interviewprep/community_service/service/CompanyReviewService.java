package com.interviewprep.community_service.service;

import com.interviewprep.community_service.dto.CompanyReviewRequestDTO;
import com.interviewprep.community_service.dto.CompanyReviewResponseDTO;
import com.interviewprep.community_service.model.CompanyReview;
import com.interviewprep.community_service.repository.CompanyReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyReviewService {

    private final CompanyReviewRepository reviewRepository;
    private final CompanySummaryService summaryService;

    @Transactional
    public CompanyReviewResponseDTO createReview(CompanyReviewRequestDTO dto, String authorKeycloakId) {
        CompanyReview review = CompanyReview.builder()
                .authorKeycloakId(authorKeycloakId)
                .companyNameDisplay(dto.getCompanyNameDisplay())
                .roleTitle(dto.getRoleTitle())
                .interviewType(dto.getInterviewType())
                .difficulty(dto.getDifficulty())
                .outcome(dto.getOutcome())
                .overallRating(dto.getOverallRating())
                .reviewText(dto.getReviewText())
                .processDescription(dto.getProcessDescription())
                .isAnonymous(dto.isAnonymous())
                .build();
        CompanyReview saved = reviewRepository.save(review);
        summaryService.invalidateSummary(saved.getCompanyNameNormalized());
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public Page<CompanyReviewResponseDTO> getReviewsByCompany(String companyName, Pageable pageable) {
        String normalized = companyName.trim().toLowerCase();
        return reviewRepository.findByCompanyNameNormalized(normalized, pageable)
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public CompanyReviewResponseDTO getReviewById(Long id) {
        CompanyReview review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        return toDTO(review);
    }

    @Transactional
    public CompanyReviewResponseDTO updateReview(Long id, CompanyReviewRequestDTO dto, String authorKeycloakId) {
        CompanyReview review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        if (!review.getAuthorKeycloakId().equals(authorKeycloakId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to update this review");
        }
        String oldNormalizedName = review.getCompanyNameNormalized();
        review.setCompanyNameDisplay(dto.getCompanyNameDisplay());
        review.setCompanyNameNormalized(dto.getCompanyNameDisplay().trim().toLowerCase());
        review.setRoleTitle(dto.getRoleTitle());
        review.setInterviewType(dto.getInterviewType());
        review.setDifficulty(dto.getDifficulty());
        review.setOutcome(dto.getOutcome());
        review.setOverallRating(dto.getOverallRating());
        review.setReviewText(dto.getReviewText());
        review.setProcessDescription(dto.getProcessDescription());
        review.setAnonymous(dto.isAnonymous());
        CompanyReviewResponseDTO result = toDTO(reviewRepository.save(review));
        summaryService.invalidateSummary(oldNormalizedName);
        summaryService.invalidateSummary(review.getCompanyNameNormalized());
        return result;
    }

    @Transactional
    public void deleteReview(Long id, String authorKeycloakId) {
        CompanyReview review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        if (!review.getAuthorKeycloakId().equals(authorKeycloakId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this review");
        }
        String normalizedName = review.getCompanyNameNormalized();
        reviewRepository.delete(review);
        summaryService.invalidateSummary(normalizedName);
    }

    @Transactional(readOnly = true)
    public List<CompanyReviewResponseDTO> getMyReviews(String authorKeycloakId) {
        return reviewRepository.findByAuthorKeycloakId(authorKeycloakId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> searchCompanies(String query) {
        return reviewRepository.searchCompanyNames(query.trim().toLowerCase());
    }

    private CompanyReviewResponseDTO toDTO(CompanyReview review) {
        return CompanyReviewResponseDTO.builder()
                .id(review.getId())
                .companyNameDisplay(review.getCompanyNameDisplay())
                .companyNameNormalized(review.getCompanyNameNormalized())
                .roleTitle(review.getRoleTitle())
                .interviewType(review.getInterviewType())
                .difficulty(review.getDifficulty())
                .outcome(review.getOutcome())
                .overallRating(review.getOverallRating())
                .reviewText(review.getReviewText())
                .processDescription(review.getProcessDescription())
                .isAnonymous(review.isAnonymous())
                .helpfulCount(review.getHelpfulCount())
                .createdAt(review.getCreatedAt())
                .authorKeycloakId(review.isAnonymous() ? null : review.getAuthorKeycloakId())
                .authorDisplayName(review.isAnonymous() ? null : review.getAuthorKeycloakId())
                .build();
    }
}
