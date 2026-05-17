package com.interviewprep.community_service.controller;

import com.interviewprep.community_service.service.PostBookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/community/bookmarks")
@RequiredArgsConstructor
public class PostBookmarkController {

    private final PostBookmarkService postBookmarkService;

    @PostMapping("/{postId}/toggle")
    public ResponseEntity<Map<String, Object>> toggleBookmark(
            @PathVariable Long postId,
            @AuthenticationPrincipal Jwt jwt) {
        String userKeycloakId = jwt.getSubject();
        boolean isBookmarked = postBookmarkService.toggleBookmark(userKeycloakId, postId);
        long bookmarkCount = postBookmarkService.countBookmarks(postId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("bookmarked", isBookmarked);
        response.put("bookmarkCount", bookmarkCount);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyBookmarks(
            @AuthenticationPrincipal Jwt jwt) {
        String userKeycloakId = jwt.getSubject();
        var bookmarkedPosts = postBookmarkService.getBookmarkedPosts(userKeycloakId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", bookmarkedPosts);
        response.put("total", bookmarkedPosts.size());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{postId}/status")
    public ResponseEntity<Map<String, Object>> getBookmarkStatus(
            @PathVariable Long postId,
            @AuthenticationPrincipal Jwt jwt) {
        String userKeycloakId = jwt.getSubject();
        boolean isBookmarked = postBookmarkService.isBookmarked(userKeycloakId, postId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("bookmarked", isBookmarked);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{postId}/count")
    public ResponseEntity<Map<String, Object>> getBookmarkCount(@PathVariable Long postId) {
        long count = postBookmarkService.countBookmarks(postId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", count);
        return ResponseEntity.ok(response);
    }
}
