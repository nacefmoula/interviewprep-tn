package com.microservice.resourceservice.service;

import com.microservice.resourceservice.dto.FileUploadResponse;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ObjectStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 250L * 1024L * 1024L;

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucketName;

    @Value("${minio.public-endpoint:${minio.endpoint}}")
    private String publicEndpoint;

    private volatile boolean bucketInitialized = false;
    private final Object bucketLock = new Object();

    public FileUploadResponse upload(MultipartFile file, String kind) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File is too large. Max size is 250 MB");
        }

        String normalizedKind = normalizeKind(kind);
        String fileName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
        String extension = extractExtension(fileName);
        String contentType = resolveContentType(file.getContentType(), extension);

        if (!isAllowedContent(contentType)) {
            throw new IllegalArgumentException("Only PDF, video, and image files are allowed");
        }
        if ("thumbnail".equals(normalizedKind) && !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Thumbnail upload requires an image file");
        }

        String objectKey = normalizedKind + "/" + UUID.randomUUID() + extension;

        try {
            ensureBucketReady();

            try (InputStream stream = file.getInputStream()) {
                minioClient.putObject(
                    PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectKey)
                        .stream(stream, file.getSize(), -1)
                        .contentType(contentType)
                        .build()
                );
            }

            return FileUploadResponse.builder()
                .fileUrl(buildPublicUrl(objectKey))
                .objectKey(objectKey)
                .originalFileName(fileName)
                .contentType(contentType)
                .size(file.getSize())
                .build();
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to upload file to MinIO", ex);
            throw new IllegalStateException("Failed to upload file");
        }
    }

    private String normalizeKind(String kind) {
        if (!StringUtils.hasText(kind)) {
            return "resource";
        }
        String candidate = kind.trim().toLowerCase(Locale.ROOT);
        if ("resource".equals(candidate) || "thumbnail".equals(candidate)) {
            return candidate;
        }
        return "resource";
    }

    private String extractExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0 || lastDot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(lastDot).toLowerCase(Locale.ROOT);
    }

    private String resolveContentType(String contentType, String extension) {
        if (StringUtils.hasText(contentType) && !"application/octet-stream".equalsIgnoreCase(contentType)) {
            return contentType.toLowerCase(Locale.ROOT);
        }
        return switch (extension) {
            case ".pdf" -> "application/pdf";
            case ".png" -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".mp4" -> "video/mp4";
            case ".webm" -> "video/webm";
            case ".mov" -> "video/quicktime";
            default -> "application/octet-stream";
        };
    }

    private boolean isAllowedContent(String contentType) {
        return "application/pdf".equals(contentType)
            || contentType.startsWith("video/")
            || contentType.startsWith("image/");
    }

    private String buildPublicUrl(String objectKey) {
        String base = publicEndpoint.endsWith("/") ? publicEndpoint.substring(0, publicEndpoint.length() - 1) : publicEndpoint;
        return base + "/" + bucketName + "/" + objectKey;
    }

    public void deleteObject(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return;
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build()
            );
            log.info("Deleted MinIO object: {}/{}", bucketName, objectKey);
        } catch (Exception ex) {
            log.warn("Failed to delete MinIO object {}/{}: {}", bucketName, objectKey, ex.getMessage());
        }
    }

    private void ensureBucketReady() throws Exception {
        if (bucketInitialized) {
            return;
        }
        synchronized (bucketLock) {
            if (bucketInitialized) {
                return;
            }

            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }

            String policy = """
                {
                  "Version":"2012-10-17",
                  "Statement":[
                    {
                      "Effect":"Allow",
                      "Principal":{"AWS":["*"]},
                      "Action":["s3:GetObject"],
                      "Resource":["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """.formatted(bucketName);

            minioClient.setBucketPolicy(
                SetBucketPolicyArgs.builder()
                    .bucket(bucketName)
                    .config(policy)
                    .build()
            );

            bucketInitialized = true;
        }
    }
}
