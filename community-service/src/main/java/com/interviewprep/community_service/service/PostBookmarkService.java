package com.interviewprep.community_service.service;

import com.interviewprep.community_service.model.Post;
import com.interviewprep.community_service.model.PostBookmark;
import com.interviewprep.community_service.repository.PostBookmarkRepository;
import com.interviewprep.community_service.repository.PostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PostBookmarkService {

    private final PostBookmarkRepository postBookmarkRepository;
    private final PostRepository postRepository;

    public boolean toggleBookmark(String userKeycloakId, Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new EntityNotFoundException("Post not found: " + postId);
        }

        if (postBookmarkRepository.existsByUserKeycloakIdAndPostId(userKeycloakId, postId)) {
            postBookmarkRepository.deleteByUserKeycloakIdAndPostId(userKeycloakId, postId);
            return false;
        } else {
            Post post = postRepository.findById(postId)
                    .orElseThrow(() -> new EntityNotFoundException("Post not found: " + postId));
            PostBookmark bookmark = PostBookmark.builder()
                    .userKeycloakId(userKeycloakId)
                    .post(post)
                    .build();
            postBookmarkRepository.save(bookmark);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public List<Post> getBookmarkedPosts(String userKeycloakId) {
        return postBookmarkRepository.findByUserKeycloakIdOrderByCreatedAtDesc(userKeycloakId)
                .stream()
                .map(PostBookmark::getPost)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean isBookmarked(String userKeycloakId, Long postId) {
        return postBookmarkRepository.existsByUserKeycloakIdAndPostId(userKeycloakId, postId);
    }

    @Transactional(readOnly = true)
    public long countBookmarks(Long postId) {
        return postBookmarkRepository.countByPostId(postId);
    }
}
