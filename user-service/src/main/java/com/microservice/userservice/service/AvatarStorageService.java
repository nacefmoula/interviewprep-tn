package com.microservice.userservice.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AvatarStorageService {

    private static final long MAX_AVATAR_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/png", "image/jpeg", "image/webp");

    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/webp", ".webp");

    private final Path avatarsDirectory;

    public AvatarStorageService(@Value("${app.uploads-dir:uploads}") String uploadsDir) {
        this.avatarsDirectory = Path.of(uploadsDir, "avatars").toAbsolutePath().normalize();
    }

    public String storeAvatar(MultipartFile file) {
        validate(file);

        try {
            Files.createDirectories(avatarsDirectory);
            String extension = resolveExtension(file);
            String fileName = UUID.randomUUID() + extension;
            Path target = avatarsDirectory.resolve(fileName);

            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/avatars/" + fileName;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to store avatar file", exception);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Avatar file is required");
        }

        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Only PNG, JPEG, and WEBP images are allowed");
        }

        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("Avatar file must be 5MB or less");
        }
    }

    private String resolveExtension(MultipartFile file) {
        String byContentType = EXTENSIONS_BY_CONTENT_TYPE.get(file.getContentType());
        if (byContentType != null) {
            return byContentType;
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.contains(".")) {
            return ".jpg";
        }

        String extension = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
        if (extension.equals(".jpeg")) {
            return ".jpg";
        }
        return extension;
    }
}
