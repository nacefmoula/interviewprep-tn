package com.interviewprep.community_service.service;

import com.interviewprep.community_service.dto.*;
import com.interviewprep.community_service.model.Comment;
import com.interviewprep.community_service.model.Follow;
import com.interviewprep.community_service.model.KarmaScore;
import com.interviewprep.community_service.model.Post;
import com.interviewprep.community_service.repository.CommentRepository;
import com.interviewprep.community_service.repository.FollowRepository;
import com.interviewprep.community_service.repository.KarmaRepository;
import com.interviewprep.community_service.repository.PostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;
    private final KarmaRepository karmaRepository;

    // ─── Posts ────────────────────────────────────────────────────────────────

    public PageResponse<PostResponse> getPosts(int page, int size, String type, String industry, String sort) {
        Sort sortObj = buildSort(sort);
        Pageable pageable = PageRequest.of(page, size, sortObj);

        Page<Post> result;
        boolean hasType = type != null && !type.isBlank();
        boolean hasIndustry = industry != null && !industry.isBlank();

        if (hasType && hasIndustry) {
            result = postRepository.findByTypeAndIndustry(type, industry, pageable);
        } else if (hasType) {
            result = postRepository.findByType(type, pageable);
        } else if (hasIndustry) {
            result = postRepository.findByIndustry(industry, pageable);
        } else {
            result = postRepository.findAll(pageable);
        }

        return PageResponse.<PostResponse>builder()
                .content(result.getContent().stream().map(this::toPostResponse).collect(Collectors.toList()))
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .number(result.getNumber())
                .size(result.getSize())
                .build();
    }

    public PageResponse<PostResponse> searchPosts(String query, int page, int size) {
        if (query == null || query.trim().isEmpty()) {
            return getPosts(page, size, null, null, "createdAt,desc");
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> result = postRepository.searchPosts(query.trim(), pageable);
        List<PostResponse> responses = result.getContent()
                .stream().map(this::toPostResponse).collect(Collectors.toList());
        return PageResponse.<PostResponse>builder()
                .content(responses)
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .number(result.getNumber())
                .size(result.getSize())
                .build();
    }

    @Transactional
    public PostResponse getPost(Long id) {
        Post post = findPost(id);
        post.setViewCount(post.getViewCount() + 1);
        post = postRepository.save(post);
        return toPostResponse(post);
    }

    @Transactional
    public PostResponse createPost(CreatePostRequest req, String authorKeycloakId) {
        Post post = Post.builder()
                .authorKeycloakId(authorKeycloakId)
                .title(req.getTitle())
                .content(req.getContent())
                .type(req.getType())
                .industry(req.getIndustry())
                .tags(req.getTags())
                .build();
        post = postRepository.save(post);
        addKarma(authorKeycloakId, "", 1, "POST_CREATED");
        return toPostResponse(post);
    }

    @Transactional
    public PostResponse updatePost(Long id, UpdatePostRequest req, String authorKeycloakId) {
        Post post = findPost(id);
        if (!post.getAuthorKeycloakId().equals(authorKeycloakId)) {
            throw new AccessDeniedException("You can only edit your own posts");
        }
        if (req.getTitle() != null) post.setTitle(req.getTitle());
        if (req.getContent() != null) post.setContent(req.getContent());
        if (req.getType() != null) post.setType(req.getType());
        if (req.getIndustry() != null) post.setIndustry(req.getIndustry());
        if (req.getTags() != null) post.setTags(req.getTags());
        return toPostResponse(postRepository.save(post));
    }

    @Transactional
    public void deletePost(Long id, String keycloakId, boolean isAdmin) {
        Post post = findPost(id);
        if (!isAdmin && !post.getAuthorKeycloakId().equals(keycloakId)) {
            throw new AccessDeniedException("You can only delete your own posts");
        }
        postRepository.delete(post);
    }

    @Transactional
    public PostResponse upvotePost(Long id) {
        Post post = findPost(id);
        post.setUpvotes(post.getUpvotes() + 1);
        post = postRepository.save(post);
        addKarma(post.getAuthorKeycloakId(), "", 2, "POST_UPVOTED");
        return toPostResponse(post);
    }

    @Transactional
    public PostResponse downvotePost(Long id) {
        Post post = findPost(id);
        post.setDownvotes(post.getDownvotes() + 1);
        return toPostResponse(postRepository.save(post));
    }

    @Transactional
    public void reportPost(Long id) {
        Post post = findPost(id);
        post.setIsReported(true);
        postRepository.save(post);
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    public List<CommentResponse> getComments(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new EntityNotFoundException("Post not found: " + postId);
        }
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream().map(this::toCommentResponse).collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse addComment(Long postId, CreateCommentRequest req, String authorKeycloakId) {
        if (!postRepository.existsById(postId)) {
            throw new EntityNotFoundException("Post not found: " + postId);
        }
        Comment comment = Comment.builder()
                .postId(postId)
                .authorKeycloakId(authorKeycloakId)
                .content(req.getContent())
                .parentCommentId(req.getParentCommentId())
                .build();
        comment = commentRepository.save(comment);
        addKarma(authorKeycloakId, "", 1, "COMMENT_CREATED");
        return toCommentResponse(comment);
    }

    @Transactional
    public CommentResponse updateComment(Long id, String content, String requesterKeycloakId) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found: " + id));
        if (!comment.getAuthorKeycloakId().equals(requesterKeycloakId)) {
            throw new AccessDeniedException("You can only edit your own comments");
        }
        comment.setContent(content.trim());
        comment.setIsEdited(true);
        return toCommentResponse(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(Long id, String keycloakId) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found: " + id));
        if (!comment.getAuthorKeycloakId().equals(keycloakId)) {
            throw new AccessDeniedException("You can only delete your own comments");
        }
        commentRepository.delete(comment);
    }

    @Transactional
    public CommentResponse upvoteComment(Long id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found: " + id));
        comment.setUpvotes(comment.getUpvotes() + 1);
        comment = commentRepository.save(comment);
        addKarma(comment.getAuthorKeycloakId(), "", 1, "COMMENT_UPVOTED");
        return toCommentResponse(comment);
    }

    // ─── Follows ──────────────────────────────────────────────────────────────

    @Transactional
    public void followUser(String followerKeycloakId, String followingKeycloakId) {
        if (followRepository.existsByFollowerKeycloakIdAndFollowingKeycloakId(followerKeycloakId, followingKeycloakId)) {
            return;
        }
        Follow follow = Follow.builder()
                .followerKeycloakId(followerKeycloakId)
                .followingKeycloakId(followingKeycloakId)
                .build();
        followRepository.save(follow);
    }

    @Transactional
    public void unfollowUser(String followerKeycloakId, String followingKeycloakId) {
        followRepository.findByFollowerKeycloakIdAndFollowingKeycloakId(followerKeycloakId, followingKeycloakId)
                .ifPresent(followRepository::delete);
    }

    public boolean isFollowing(String followerKeycloakId, String followingKeycloakId) {
        return followRepository.existsByFollowerKeycloakIdAndFollowingKeycloakId(followerKeycloakId, followingKeycloakId);
    }

    public List<FollowResponse> getFollowers(String keycloakId) {
        return followRepository.findByFollowingKeycloakId(keycloakId)
                .stream().map(this::toFollowResponse).collect(Collectors.toList());
    }

    public List<FollowResponse> getFollowing(String keycloakId) {
        return followRepository.findByFollowerKeycloakId(keycloakId)
                .stream().map(this::toFollowResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getFollowingFeed(String followerKeycloakId, int page, int size) {
        List<String> followingIds = followRepository.findByFollowerKeycloakId(followerKeycloakId)
                .stream()
                .map(Follow::getFollowingKeycloakId)
                .collect(Collectors.toList());

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Post> result;
        if (followingIds.isEmpty()) {
            result = Page.empty(pageable);
        } else {
            result = postRepository.findByAuthorKeycloakIdIn(followingIds, pageable);
        }

        return PageResponse.<PostResponse>builder()
                .content(result.getContent().stream().map(this::toPostResponse).collect(Collectors.toList()))
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .number(result.getNumber())
                .size(result.getSize())
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> getMyPosts(String authorKeycloakId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> result = postRepository.findByAuthorKeycloakId(authorKeycloakId, pageable);

        return PageResponse.<PostResponse>builder()
                .content(result.getContent().stream().map(this::toPostResponse).collect(Collectors.toList()))
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .number(result.getNumber())
                .size(result.getSize())
                .build();
    }

    // ─── Karma ────────────────────────────────────────────────────────────────

    public List<KarmaResponse> getLeaderboard() {
        return karmaRepository.findTop10ByOrderByTotalKarmaDesc()
                .stream().map(this::toKarmaResponse).collect(Collectors.toList());
    }

    public KarmaResponse getMyKarma(String keycloakId) {
        return karmaRepository.findByKeycloakId(keycloakId)
                .map(this::toKarmaResponse)
                .orElse(KarmaResponse.builder()
                        .keycloakId(keycloakId)
                        .displayName("")
                        .totalKarma(0)
                        .postsCount(0)
                        .commentsCount(0)
                        .upvotesReceived(0)
                        .updatedAt(LocalDateTime.now())
                        .build());
    }

    public KarmaResponse getUserKarma(String keycloakId) {
        return karmaRepository.findByKeycloakId(keycloakId)
                .map(this::toKarmaResponse)
                .orElse(KarmaResponse.builder()
                        .keycloakId(keycloakId)
                        .displayName("")
                        .totalKarma(0)
                        .postsCount(0)
                        .commentsCount(0)
                        .upvotesReceived(0)
                        .updatedAt(LocalDateTime.now())
                        .build());
    }

    // ─── User Profiles ────────────────────────────────────────────────────────

    public UserProfileResponse getUserProfile(String keycloakId) {
        KarmaScore karma = karmaRepository.findByKeycloakId(keycloakId)
                .orElse(KarmaScore.builder().keycloakId(keycloakId).totalKarma(0).build());

        long followersCount = followRepository.findByFollowingKeycloakId(keycloakId).size();
        long followingCount = followRepository.findByFollowerKeycloakId(keycloakId).size();

        Page<Post> recentPostsPage = postRepository
                .findByAuthorKeycloakIdOrderByCreatedAtDesc(keycloakId, PageRequest.of(0, 5));
        List<PostResponse> recentPosts = recentPostsPage.getContent()
                .stream().map(this::toPostResponse).collect(Collectors.toList());

        return UserProfileResponse.builder()
                .keycloakId(keycloakId)
                .displayName(karma.getDisplayName() != null ? karma.getDisplayName() : "Community Member")
                .totalKarma(karma.getTotalKarma())
                .postsCount(karma.getPostsCount())
                .commentsCount(karma.getCommentsCount())
                .upvotesReceived(karma.getUpvotesReceived())
                .followersCount(followersCount)
                .followingCount(followingCount)
                .recentPosts(recentPosts)
                .build();
    }

    private void addKarma(String keycloakId, String displayName, int points, String reason) {
        KarmaScore karma = karmaRepository.findByKeycloakId(keycloakId)
                .orElse(KarmaScore.builder()
                        .keycloakId(keycloakId)
                        .displayName(displayName)
                        .totalKarma(0)
                        .postsCount(0)
                        .commentsCount(0)
                        .upvotesReceived(0)
                        .build());

        karma.setTotalKarma(karma.getTotalKarma() + points);
        karma.setUpdatedAt(LocalDateTime.now());

        if (reason.equals("POST_CREATED")) karma.setPostsCount(karma.getPostsCount() + 1);
        if (reason.equals("COMMENT_CREATED")) karma.setCommentsCount(karma.getCommentsCount() + 1);
        if (reason.equals("POST_UPVOTED") || reason.equals("COMMENT_UPVOTED"))
            karma.setUpvotesReceived(karma.getUpvotesReceived() + 1);

        karmaRepository.save(karma);
    }

    // ─── Mappers ──────────────────────────────────────────────────────────────

    private PostResponse toPostResponse(Post post) {
        Integer authorKarma = karmaRepository.findByKeycloakId(post.getAuthorKeycloakId())
                .map(KarmaScore::getTotalKarma).orElse(0);
        return PostResponse.builder()
                .id(post.getId())
                .authorKeycloakId(post.getAuthorKeycloakId())
                .title(post.getTitle())
                .content(post.getContent())
                .type(post.getType())
                .industry(post.getIndustry())
                .tags(post.getTags())
                .upvotes(post.getUpvotes())
                .downvotes(post.getDownvotes())
                .viewCount(post.getViewCount())
                .isPinned(post.getIsPinned())
                .isReported(post.getIsReported())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .score(post.getScore())
                .authorKarma(authorKarma)
                .build();
    }

    private CommentResponse toCommentResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .authorKeycloakId(comment.getAuthorKeycloakId())
                .content(comment.getContent())
                .parentCommentId(comment.getParentCommentId())
                .upvotes(comment.getUpvotes())
                .isEdited(comment.getIsEdited())
                .isReported(comment.getIsReported())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private FollowResponse toFollowResponse(Follow follow) {
        return FollowResponse.builder()
                .followerKeycloakId(follow.getFollowerKeycloakId())
                .followingKeycloakId(follow.getFollowingKeycloakId())
                .followedAt(follow.getFollowedAt())
                .build();
    }

    private KarmaResponse toKarmaResponse(KarmaScore karma) {
        return KarmaResponse.builder()
                .keycloakId(karma.getKeycloakId())
                .displayName(karma.getDisplayName())
                .totalKarma(karma.getTotalKarma())
                .postsCount(karma.getPostsCount())
                .commentsCount(karma.getCommentsCount())
                .upvotesReceived(karma.getUpvotesReceived())
                .updatedAt(karma.getUpdatedAt())
                .build();
    }

    private Post findPost(Long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Post not found: " + id));
    }

    private Sort buildSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        Sort.Direction direction = parts.length > 1 && parts[1].trim().equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }
}
