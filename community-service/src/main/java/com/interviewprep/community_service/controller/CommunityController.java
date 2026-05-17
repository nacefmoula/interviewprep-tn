package com.interviewprep.community_service.controller;

import com.interviewprep.community_service.dto.*;
import com.interviewprep.community_service.repository.FollowRepository;
import com.interviewprep.community_service.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;
    private final FollowRepository followRepository;

    // ─── Posts ────────────────────────────────────────────────────────────────

    @GetMapping("/posts")
    public ResponseEntity<PageResponse<PostResponse>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String industry,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        return ResponseEntity.ok(communityService.getPosts(page, size, type, industry, sort));
    }

    @GetMapping("/posts/search")
    public ResponseEntity<PageResponse<PostResponse>> searchPosts(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(communityService.searchPosts(q, page, size));
    }

    @GetMapping("/posts/feed")
    public ResponseEntity<PageResponse<PostResponse>> getFollowingFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(communityService.getFollowingFeed(jwt.getSubject(), page, size));
    }

    @GetMapping("/posts/my")
    public ResponseEntity<PageResponse<PostResponse>> getMyPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(communityService.getMyPosts(jwt.getSubject(), page, size));
    }

    @GetMapping("/posts/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(communityService.getPost(id));
    }

    @PostMapping("/posts")
    public ResponseEntity<PostResponse> createPost(
            @Valid @RequestBody CreatePostRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(communityService.createPost(req, jwt.getSubject()));
    }

    @PutMapping("/posts/{id}")
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable Long id,
            @RequestBody UpdatePostRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(communityService.updatePost(id, req, jwt.getSubject()));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        communityService.deletePost(id, jwt.getSubject(), hasAdminRole(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{id}/upvote")
    public ResponseEntity<PostResponse> upvotePost(@PathVariable Long id) {
        return ResponseEntity.ok(communityService.upvotePost(id));
    }

    @PostMapping("/posts/{id}/downvote")
    public ResponseEntity<PostResponse> downvotePost(@PathVariable Long id) {
        return ResponseEntity.ok(communityService.downvotePost(id));
    }

    @PostMapping("/posts/{id}/report")
    public ResponseEntity<Void> reportPost(@PathVariable Long id) {
        communityService.reportPost(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long postId) {
        return ResponseEntity.ok(communityService.getComments(postId));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(communityService.addComment(postId, req, jwt.getSubject()));
    }

    @PutMapping("/comments/{id}")
    public ResponseEntity<?> updateComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Content cannot be empty"));
        }
        return ResponseEntity.ok(communityService.updateComment(id, content, jwt.getSubject()));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        communityService.deleteComment(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/comments/{id}/upvote")
    public ResponseEntity<CommentResponse> upvoteComment(@PathVariable Long id) {
        return ResponseEntity.ok(communityService.upvoteComment(id));
    }

    // ─── Follows ──────────────────────────────────────────────────────────────

    @PostMapping("/follow/{targetKeycloakId}")
    public ResponseEntity<Void> followUser(
            @PathVariable String targetKeycloakId,
            @AuthenticationPrincipal Jwt jwt) {
        communityService.followUser(jwt.getSubject(), targetKeycloakId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/follow/{targetKeycloakId}")
    public ResponseEntity<Void> unfollowUser(
            @PathVariable String targetKeycloakId,
            @AuthenticationPrincipal Jwt jwt) {
        communityService.unfollowUser(jwt.getSubject(), targetKeycloakId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/follow/{keycloakId}/status")
    public ResponseEntity<Map<String, Boolean>> followStatus(
            @PathVariable String keycloakId,
            @AuthenticationPrincipal Jwt jwt) {
        boolean following = communityService.isFollowing(jwt.getSubject(), keycloakId);
        return ResponseEntity.ok(Map.of("following", following));
    }

    @GetMapping("/follow/followers")
    public ResponseEntity<List<FollowResponse>> getFollowers(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(communityService.getFollowers(jwt.getSubject()));
    }

    @GetMapping("/follow/following")
    public ResponseEntity<List<FollowResponse>> getFollowing(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(communityService.getFollowing(jwt.getSubject()));
    }

    // ─── Karma ────────────────────────────────────────────────────────────────

    @GetMapping("/karma/leaderboard")
    public ResponseEntity<List<KarmaResponse>> getLeaderboard() {
        return ResponseEntity.ok(communityService.getLeaderboard());
    }

    @GetMapping("/karma/me")
    public ResponseEntity<KarmaResponse> getMyKarma(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(communityService.getMyKarma(jwt.getSubject()));
    }

    @GetMapping("/karma/{keycloakId}")
    public ResponseEntity<KarmaResponse> getUserKarma(@PathVariable String keycloakId) {
        return ResponseEntity.ok(communityService.getUserKarma(keycloakId));
    }

    // ─── User Profiles ────────────────────────────────────────────────────────

    @GetMapping("/users/{keycloakId}/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable String keycloakId) {
        return ResponseEntity.ok(communityService.getUserProfile(keycloakId));
    }

    @GetMapping("/users/{keycloakId}/is-following")
    public ResponseEntity<Map<String, Boolean>> checkFollowing(
            @PathVariable String keycloakId,
            @AuthenticationPrincipal Jwt jwt) {
        String myKeycloakId = jwt.getSubject();
        boolean following = followRepository
                .existsByFollowerKeycloakIdAndFollowingKeycloakId(myKeycloakId, keycloakId);
        return ResponseEntity.ok(Map.of("following", following));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private boolean hasAdminRole(Jwt jwt) {
        try {
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess == null) return false;
            List<String> roles = (List<String>) realmAccess.get("roles");
            return roles != null && roles.stream().anyMatch(r -> r.equalsIgnoreCase("ADMIN"));
        } catch (Exception e) {
            return false;
        }
    }
}
