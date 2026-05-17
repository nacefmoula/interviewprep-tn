package com.microservice.userservice.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class CvStorageService {

    private static final long MAX_CV_SIZE_BYTES = 5L * 1024L * 1024L;
    private static final String PDF_CONTENT_TYPE = "application/pdf";
    private static final String CV_STORAGE_PREFIX = "cvs/";

    private final Path cvsDirectory;

    public CvStorageService(@Value("${app.uploads-dir:uploads}") String uploadsDir) {
        this.cvsDirectory = Path.of(uploadsDir, "cvs").toAbsolutePath().normalize();
    }

    public String storeCv(MultipartFile file, UUID userId) {
        validate(file);

        try {
            Files.createDirectories(cvsDirectory);
            String fileName = "user-" + userId + "-cv-" + UUID.randomUUID() + ".pdf";
            Path target = cvsDirectory.resolve(fileName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return CV_STORAGE_PREFIX + fileName;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to store CV file", exception);
        }
    }

    public void deleteOldCvIfManaged(String previousCvUrl, String currentCvUrl) {
        if (previousCvUrl == null || previousCvUrl.isBlank()) {
            return;
        }

        if (previousCvUrl.equals(currentCvUrl)) {
            return;
        }

        if (!previousCvUrl.startsWith(CV_STORAGE_PREFIX)) {
    return;
}

String fileName = previousCvUrl.substring(CV_STORAGE_PREFIX.length());
        if (fileName.contains("/") || fileName.contains("\\")) {
            return;
        }

        Path target = cvsDirectory.resolve(fileName).normalize();
        if (!target.startsWith(cvsDirectory)) {
            return;
        }

        try {
            Files.deleteIfExists(target);
        } catch (IOException exception) {
            log.warn("Failed to delete previous CV file: {}", target, exception);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CV file is required");
        }

        if (file.getSize() > MAX_CV_SIZE_BYTES) {
            throw new IllegalArgumentException("CV file must be 5MB or less");
        }

        String contentType = file.getContentType();
        String originalName = file.getOriginalFilename();
        boolean validContentType = PDF_CONTENT_TYPE.equalsIgnoreCase(contentType);
        boolean validExtension = originalName != null && originalName.toLowerCase().endsWith(".pdf");

        if (!validContentType || !validExtension) {
            throw new IllegalArgumentException("Only PDF files are allowed");
        }
    }
}
