package com.microservice.mentorshipservice.services;

import com.microservice.mentorshipservice.DTOs.MentorScoreDTO;
import com.microservice.mentorshipservice.DTOs.UserResponse;
import com.microservice.mentorshipservice.clients.GeminiClient;
import com.microservice.mentorshipservice.clients.GroqClient;
import com.microservice.mentorshipservice.clients.UserServiceClient;
import com.microservice.mentorshipservice.enums.MentorStatus;
import com.microservice.mentorshipservice.repository.MentorRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationService.class);

    @Autowired private UserServiceClient userServiceClient;
    @Autowired private MentorRequestRepository requestRepository;
    @Autowired private GeminiClient geminiClient;
    @Autowired private GroqClient groqClient;

    private static final int TOP_N = 3;

    public List<MentorScoreDTO> recommend() {

        // 1) Get mentee profile (current user)
        UserResponse mentee;
        try {
            mentee = userServiceClient.getCurrentUser();
        } catch (Exception e) {
            return List.of();
        }

        // 2) Get mentors from user service
        List<UserResponse> allMentors;
        try {
            allMentors = Optional.ofNullable(userServiceClient.getMentorPage("MENTOR", 0, 200).getContent())
                    .orElse(List.of());
        } catch (Exception e) {
            return List.of();
        }

        // 3) Get IDs of mentors already requested by this mentee (user-service UUID)
        UUID menteeId = mentee.getId();
        if (menteeId == null) {
            return List.of();
        }

        // Only exclude PENDING requests so an ACCEPTED mentor can still appear (button stays disabled).
        Set<UUID> pendingRequestedMentors = requestRepository.findByMenteeId(menteeId)
                .stream()
                .filter(r -> r.getStatus() == MentorStatus.PENDING)
                .map(r -> r.getMentorId())
                .collect(Collectors.toSet());

        // 4) Score each mentor
        List<MentorScoreDTO> scored = allMentors.stream()
                .filter(m -> m.getId() != null && !pendingRequestedMentors.contains(m.getId()))
                .filter(m -> "ACTIVE".equalsIgnoreCase(m.getStatus()))
                // avoid recommending empty profiles that always end up as 0-match
                .filter(m -> !normalize(m.getSkills()).isEmpty()
                        || !safe(m.getBio()).isBlank()
                        || Boolean.TRUE.equals(m.getIsVerified()))
                .map(m -> score(mentee, m))
                .sorted(Comparator.comparingDouble(MentorScoreDTO::getScore).reversed())
                .limit(TOP_N)
                .collect(Collectors.toList());

        if (scored.isEmpty()) return List.of();

        // 5. Generate AI explanation for top mentors
        scored.forEach(dto -> {
            String explanation = generateExplanation(mentee, dto);
            dto.setAiExplanation(explanation);
        });

        return scored;
    }

    public String chat(UUID mentorId, String message) {
        if (mentorId == null) return "Missing mentor id.";

        String trimmed = safe(message);
        if (trimmed.isBlank()) return "Ask a question to start the chat.";
        if (trimmed.length() > 800) return "Message is too long (max 800 characters).";

        UserResponse mentee;
        UserResponse mentor;
        try {
            mentee = userServiceClient.getCurrentUser();
            mentor = userServiceClient.getUserById(mentorId);
        } catch (Exception e) {
            return "Unable to load profiles for chat right now.";
        }

        MentorScoreDTO scoredMentor = score(mentee, mentor);

    if (isGreetingOnly(trimmed)) {
        String name = (safe(mentor.getFirstName()) + " " + safe(mentor.getLastName())).trim();
        String who = name.isBlank() ? "this mentor" : name;
        return ("Hi! I can only help with questions about " + who + " and why they were recommended. "
            + "Ask about your match score, missing skills, session preparation, or next steps.")
            .trim();
    }

        String prompt = """
                You are the interV AI assistant.
                The user is a mentee chatting about a mentor recommendation.

                Rules:
                - Answer the user's question directly.
                - Use ONLY the provided profile info; if something is missing, say it's missing.
                - Keep it short (max 120 words).
                - If the mentee profile is missing skills/industry, suggest adding them to improve matches.
                - Do not use bullet points.

                User question:
                %s

                Mentee profile:
                - Skills: %s
                - Preferred industry: %s
                - Bio: %s

                Mentor profile:
                - Name: %s %s
                - Skills: %s
                - Preferred industry: %s
                - Bio: %s

                Computed match score: %.1f / 100
                """.formatted(
                trimmed,
                String.join(", ", normalize(mentee.getSkills())),
                safe(mentee.getPreferredIndustry()),
                safe(mentee.getBio()),
                safe(mentor.getFirstName()),
                safe(mentor.getLastName()),
                String.join(", ", normalize(mentor.getSkills())),
                safe(mentor.getPreferredIndustry()),
                safe(mentor.getBio()),
                scoredMentor.getScore()
        );

        String ai = geminiClient.generate(prompt);
        if (ai != null && !ai.isBlank()) {
            log.info("AI chat: Gemini ok");
            return ai.trim();
        }

        String geminiReason = geminiClient.consumeLastError();
        if (geminiReason != null && !geminiReason.isBlank()) {
            log.info("AI chat: Gemini failed ({})", geminiReason);
        } else {
            log.info("AI chat: Gemini returned empty (no reason)");
        }
        String groqReason = null;

        if ("quota".equalsIgnoreCase(geminiReason)
                || "disabled".equalsIgnoreCase(geminiReason)
                || "error".equalsIgnoreCase(geminiReason)) {
            log.info("AI chat: attempting Groq fallback");
            String groq = groqClient.generate(prompt);
            if (groq != null && !groq.isBlank()) {
                log.info("AI chat: Groq ok");
                return groq.trim();
            }

			groqReason = groqClient.consumeLastError();
            if (groqReason != null && !groqReason.isBlank()) {
                log.info("AI chat: Groq failed ({})", groqReason);
            } else {
                log.info("AI chat: Groq returned empty (no reason)");
            }
        }

        return fallbackChatAnswer(mentee, scoredMentor, geminiReason, groqReason, trimmed);
    }

    private String fallbackChatAnswer(UserResponse mentee, MentorScoreDTO mentor, String geminiError, String groqError, String question) {
        List<String> menteeSkills = normalize(mentee.getSkills());
        List<String> mentorSkills = normalize(mentor.getSkills());

        String menteeIndustry = safe(mentee.getPreferredIndustry());
        String mentorIndustry = safe(mentor.getPreferredIndustry());

        boolean industryMatch = !menteeIndustry.isBlank() && !mentorIndustry.isBlank()
                && menteeIndustry.equalsIgnoreCase(mentorIndustry);

        boolean hasOverlap = false;
        if (!menteeSkills.isEmpty() && !mentorSkills.isEmpty()) {
            for (String ms : mentorSkills) {
                for (String us : menteeSkills) {
                    String a = ms.toLowerCase();
                    String b = us.toLowerCase();
                    if (a.contains(b) || b.contains(a)) {
                        hasOverlap = true;
                        break;
                    }
                }
                if (hasOverlap) break;
            }
        }

        String prefix = buildAiPrefix(geminiError, groqError);

        String q = safe(question).toLowerCase(Locale.ROOT);

        String mentorTopSkills = String.join(", ", mentorSkills.subList(0, Math.min(3, mentorSkills.size())));
        String mentorFocus = mentorTopSkills.isBlank() ? "the mentor's expertise" : mentorTopSkills;

        if ((q.contains("prepare") || q.contains("prepar"))
                && (q.contains("first") || q.contains("1st"))
                && (q.contains("session") || q.contains("meeting"))) {
            String profileHint = (menteeSkills.isEmpty() && menteeIndustry.isBlank())
                    ? " Add your skills and preferred industry in your profile to get more accurate matches."
                    : "";
            return (prefix
                    + "For your first session, share your goal and current level, then prepare 2–3 questions around "
                    + mentorFocus
                    + ". Bring a small example (project/repo or problem) so the mentor can give concrete advice, and agree on next steps at the end."
                    + profileHint).trim();
        }

        if (q.contains("score") || q.contains("match") || q.contains("recommend")) {
            if (menteeSkills.isEmpty() && menteeIndustry.isBlank()) {
                return prefix + "Your profile has no skills or industry set yet, which makes matching hard. Add them, then refresh recommendations.";
            }
            if (!hasOverlap && !industryMatch) {
                return prefix + "No direct overlap was found with your current profile, so the match score is low. Add/adjust your skills to get closer recommendations.";
            }
        }

        if (menteeSkills.isEmpty() && menteeIndustry.isBlank()) {
            return prefix + "Add your skills and preferred industry in your profile to get more accurate matches.";
        }

        if (!hasOverlap && !industryMatch) {
            return prefix + "No direct overlap was found with your current profile. Add/adjust your skills to get closer recommendations.";
        }

        return prefix + "Ask about a learning plan and next steps based on the mentor's strengths, and share what you're trying to achieve so they can tailor advice.";
    }

    private boolean isGreetingOnly(String message) {
        if (message == null) return false;
        String s = message.trim().toLowerCase(Locale.ROOT);
        s = s.replaceAll("[\\p{Punct}\\s]+", " ").trim();
        return s.equals("hi")
                || s.equals("hello")
                || s.equals("hey")
                || s.equals("salut")
                || s.equals("bonjour")
                || s.equals("hi there")
                || s.equals("hello there")
                || s.equals("hey there");
    }

    private String buildAiPrefix(String geminiError, String groqError) {
        String g = normalizeAiError(geminiError);
        String o = normalizeAiError(groqError);

        if ((g == null || g.isBlank()) && (o == null || o.isBlank())) {
            return "AI is temporarily unavailable. ";
        }

        List<String> parts = new ArrayList<>();
        if (g != null && !g.isBlank()) {
            parts.add("Gemini " + errorToHuman(g));
        }
        if (o != null && !o.isBlank()) {
            parts.add("Groq " + errorToHuman(o));
        }

        boolean anyDisabled = "disabled".equalsIgnoreCase(g) || "disabled".equalsIgnoreCase(o);
        boolean anyQuota = "quota".equalsIgnoreCase(g) || "quota".equalsIgnoreCase(o);
        if (anyDisabled && !anyQuota && parts.size() == 1) {
            return "AI is not configured. ";
        }

        return "AI is temporarily unavailable (" + String.join("; ", parts) + "). ";
    }

    private String normalizeAiError(String reason) {
        if (reason == null) return null;
        String r = reason.trim();
        return r.isBlank() ? null : r;
    }

    private String errorToHuman(String reason) {
        if (reason == null) return "unavailable";
        switch (reason.toLowerCase(Locale.ROOT)) {
            case "quota":
                return "quota exceeded";
            case "disabled":
                return "not configured";
            case "invalid_key":
                return "invalid API key";
            case "model_decommissioned":
                return "model deprecated";
            default:
                return "unavailable";
        }
    }

    // ── Rule-based scoring ────────────────────────────────────────────────────

    private MentorScoreDTO score(UserResponse mentee, UserResponse mentor) {
        double total = 0;

        // Skill match (or mentor skill richness) — 40 points max
        List<String> menteeSkills = normalize(mentee.getSkills());
        List<String> mentorSkills = normalize(mentor.getSkills());

        if (!menteeSkills.isEmpty() && !mentorSkills.isEmpty()) {
            long overlap = menteeSkills.stream()
                    .filter(s -> mentorSkills.stream().anyMatch(ms -> {
                        String a = ms.toLowerCase();
                        String b = s.toLowerCase();
                        return a.contains(b) || b.contains(a);
                    }))
                    .count();

            total += (double) overlap / menteeSkills.size() * 40;
        } else if (!mentorSkills.isEmpty()) {
            // If the mentee profile has no skills yet, prefer mentors who filled a rich skill profile.
            total += Math.min(40, mentorSkills.size() * 8);
        }

        // Same preferred industry — 30 points
        String menteeIndustry = safe(mentee.getPreferredIndustry()).toLowerCase();
        String mentorIndustry = safe(mentor.getPreferredIndustry()).toLowerCase();
        if (!menteeIndustry.isBlank() && !mentorIndustry.isBlank()
                && menteeIndustry.equals(mentorIndustry)) {
            total += 30;
        }

        // Mentor has a bio — 15 points (shows effort/professionalism)
        if (!safe(mentor.getBio()).isBlank()) {
            total += 15;
        }

        // Mentor is verified — 15 points
        if (Boolean.TRUE.equals(mentor.getIsVerified())) {
            total += 15;
        }

        MentorScoreDTO dto = new MentorScoreDTO();
        dto.setMentorId(mentor.getId());
        dto.setFirstName(safe(mentor.getFirstName()));
        dto.setLastName(safe(mentor.getLastName()));
        dto.setEmail(safe(mentor.getEmail()));
        dto.setBio(safe(mentor.getBio()));
        dto.setPreferredIndustry(safe(mentor.getPreferredIndustry()));
        dto.setSkills(mentorSkills);
        dto.setScore(Math.round(total * 10.0) / 10.0);
        dto.setStatus(safe(mentor.getStatus()));
        return dto;
    }

    // ── Gemini explanation ────────────────────────────────────────────────────

    private String generateExplanation(UserResponse mentee, MentorScoreDTO mentor) {
        String prompt = """
                You are a mentorship recommendation assistant for a platform called interV.
                
                A user is looking for a mentor. Based on the following profiles, write a 
                short, friendly, 2-sentence explanation.
                IMPORTANT: If the match score is low (below 20/100), do NOT call it a "good match"; use neutral language like "suggested" or "potential fit" and say what is missing.
                Be specific — mention actual skills or industry when available (even if there is no direct overlap).
                If there is no overlap, explain the best available reason (mentor skills, industry, or bio).
                Do not use bullet points. Do not start with "I". Keep it under 60 words.
                
                User profile:
                - Name: %s %s
                - Skills: %s
                - Preferred industry: %s
                - Bio: %s
                
                Mentor profile:
                - Name: %s %s
                - Skills: %s
                - Preferred industry: %s
                - Bio: %s
                - Match score: %.1f / 100
                
                Write the explanation now:
                """.formatted(
                safe(mentee.getFirstName()), safe(mentee.getLastName()),
                String.join(", ", normalize(mentee.getSkills())),
                safe(mentee.getPreferredIndustry()),
                safe(mentee.getBio()),
                mentor.getFirstName(), mentor.getLastName(),
                String.join(", ", normalize(mentor.getSkills())),
                safe(mentor.getPreferredIndustry()),
                safe(mentor.getBio()),
                mentor.getScore()
        );

        String ai = geminiClient.generate(prompt);
        if (ai != null && !ai.isBlank()) {
			log.info("AI explanation: Gemini ok");
            return ai.trim();
        }

        String reason = geminiClient.consumeLastError();
        if (reason != null && !reason.isBlank()) {
			log.info("AI explanation: Gemini failed ({})", reason);
		} else {
			log.info("AI explanation: Gemini returned empty (no reason)");
		}
        if ("quota".equalsIgnoreCase(reason)
                || "disabled".equalsIgnoreCase(reason)
                || "error".equalsIgnoreCase(reason)) {
        		log.info("AI explanation: attempting Groq fallback");
            String groq = groqClient.generate(prompt);
            if (groq != null && !groq.isBlank()) {
				log.info("AI explanation: Groq ok");
                return groq.trim();
            }
			String groqReason = groqClient.consumeLastError();
			if (groqReason != null && !groqReason.isBlank()) {
				log.info("AI explanation: Groq failed ({})", groqReason);
			} else {
				log.info("AI explanation: Groq returned empty (no reason)");
			}
        }

        // Fallback (no Gemini key / error): always return a logical 2-sentence explanation.
        List<String> menteeSkills = normalize(mentee.getSkills());
        List<String> mentorSkills = normalize(mentor.getSkills());

        List<String> common = new ArrayList<>();
        for (String ms : mentorSkills) {
            for (String us : menteeSkills) {
                String a = ms.toLowerCase();
                String b = us.toLowerCase();
                if (a.contains(b) || b.contains(a)) {
                    common.add(ms);
                    break;
                }
            }
            if (common.size() >= 2) break;
        }

        String menteeIndustry = safe(mentee.getPreferredIndustry()).trim();
        String mentorIndustry = safe(mentor.getPreferredIndustry()).trim();
        boolean industryMatch = !menteeIndustry.isBlank() && !mentorIndustry.isBlank()
                && menteeIndustry.equalsIgnoreCase(mentorIndustry);

        List<String> topMentorSkills = mentorSkills.subList(0, Math.min(3, mentorSkills.size()));
        String topSkillsText = topMentorSkills.isEmpty() ? "" : String.join(", ", topMentorSkills);

        double score = mentor.getScore();
        String label;
        if (score >= 70) label = "Great match";
        else if (score >= 40) label = "Good match";
        else if (score > 0) label = "Potential fit";
        else label = "Suggested mentor";

        String sentence1;
        if (!common.isEmpty()) {
            sentence1 = label + " because you share skills in " + String.join(", ", common)
                    + (industryMatch ? " and the same industry focus (" + mentorIndustry + ")." : ".");
        } else if (industryMatch) {
            sentence1 = label + " because you share an industry focus in " + mentorIndustry + ".";
        } else if (!topSkillsText.isBlank()) {
            sentence1 = label + " based on " + safe(mentor.getFirstName()) + "'s strengths in " + topSkillsText
                    + (!mentorIndustry.isBlank() ? " (" + mentorIndustry + ")." : ".");
        } else {
            sentence1 = label + " based on the available profile information.";
        }

        String scoreText = String.format("%.0f", score) + "/100";
        String sentence2;
        if (score < 20) {
            if (menteeSkills.isEmpty() && menteeIndustry.isBlank()) {
                sentence2 = "Your profile has no skills or industry set yet, so the match score is " + scoreText + "; add them for better matches.";
            } else if (common.isEmpty() && !industryMatch) {
                sentence2 = "No direct overlap was found with your current profile, so the match score is " + scoreText + "; update your skills for closer matches.";
            } else {
                sentence2 = "The match score is " + scoreText + ".";
            }
        } else {
            sentence2 = "The match score is " + scoreText + ".";
        }

        return (sentence1 + " " + sentence2).trim();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<String> normalize(List<String> list) {
        if (list == null) return List.of();
        return list.stream()
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.toList());
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

}