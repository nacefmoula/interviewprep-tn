package com.microservice.userservice.service;

import java.io.IOException;
import java.nio.file.Path;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class PdfTextExtractorService {

    private static final int MIN_USEFUL_TEXT_LENGTH = 100;

    private final Path uploadsBasePath;

    public PdfTextExtractorService(
            @Value("${app.uploads-dir:uploads}") String uploadsDir) {
        this.uploadsBasePath = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    /**
     * Extracts raw text from the PDF stored at {@code cvUrl}.
     *
     * @param cvUrl the relative stored CV path, e.g. {@code cvs/user-xxx.pdf}
     * @return an {@link ExtractionResult} containing the text and a usability flag
     * @throws PdfExtractionException if the file cannot be read or parsed
     */
    public ExtractionResult extractText(String cvUrl) {
        Path filePath = resolveFilePath(cvUrl);
        log.info("Extracting text from PDF: {}", filePath);

        try (PDDocument document = Loader.loadPDF(filePath.toFile())) {

            if (document.isEncrypted()) {
                log.warn("PDF is encrypted, skipping extraction: {}", filePath);
                throw new PdfExtractionException("PDF is encrypted and cannot be read.");
            }

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String rawText = stripper.getText(document);
            String cleanedText = clean(rawText);

            log.info("Extracted {} characters from PDF: {}", cleanedText.length(), filePath);

            if (cleanedText.length() < MIN_USEFUL_TEXT_LENGTH) {
                log.warn("Extracted text is too short ({} chars), PDF may be image-based: {}",
                        cleanedText.length(), filePath);
                return ExtractionResult.lowQuality(cleanedText);
            }

            return ExtractionResult.ok(cleanedText);

        } catch (IOException ex) {
            log.error("Failed to extract text from PDF: {}", filePath, ex);
            throw new PdfExtractionException("Failed to read PDF file: " + ex.getMessage(), ex);
        }
    }

    /**
     * Resolves the stored relative CV path to an absolute file-system path.
     * Example stored value: {@code cvs/user-xxx.pdf}
     * This path is resolved under the configured uploads directory.
     */
    private Path resolveFilePath(String cvUrl) {
        if (cvUrl == null || cvUrl.isBlank()) {
            throw new PdfExtractionException("CV path is null or empty.");
        }

        Path resolved = uploadsBasePath.resolve(cvUrl).normalize();

        if (!resolved.startsWith(uploadsBasePath)) {
            throw new PdfExtractionException("Invalid CV path detected: " + cvUrl);
        }

        return resolved;
    }

    private String clean(String raw) {
        if (raw == null) return "";
        return raw
                .replaceAll("\\r\\n", "\n")
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }

    public record ExtractionResult(String text, boolean usable) {
        static ExtractionResult ok(String text) {
            return new ExtractionResult(text, true);
        }

        static ExtractionResult lowQuality(String text) {
            return new ExtractionResult(text, false);
        }

        public boolean isUsable() {
            return usable;
        }
    }

    public static class PdfExtractionException extends RuntimeException {
        public PdfExtractionException(String message) {
            super(message);
        }
        public PdfExtractionException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}