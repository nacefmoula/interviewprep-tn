package com.interviewprep.community_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.community_service.model.JobCatalog;
import com.interviewprep.community_service.repository.JobCatalogRepository;
import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class ExternalJobFetcherService {

    private final WebClient arbeitnowClient;
    private final WebClient remoteOkClient;
    private final JobCatalogRepository jobCatalogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
    /** Ceiling for the whole call including bounded retries — guarantees the scheduler thread is freed. */
    private static final Duration OVERALL_TIMEOUT = Duration.ofSeconds(60);
    private static final Retry RETRY_BACKOFF =
            Retry.backoff(2, Duration.ofSeconds(2)).maxBackoff(Duration.ofSeconds(10));

    public ExternalJobFetcherService(WebClient.Builder webClientBuilder, JobCatalogRepository jobCatalogRepository) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5_000)
                .responseTimeout(REQUEST_TIMEOUT);
        ReactorClientHttpConnector connector = new ReactorClientHttpConnector(httpClient);
        this.arbeitnowClient = webClientBuilder.clone()
                .clientConnector(connector)
                .baseUrl("https://www.arbeitnow.com").build();
        this.remoteOkClient = webClientBuilder.clone()
                .clientConnector(connector)
                .baseUrl("https://remoteok.com").build();
        this.jobCatalogRepository = jobCatalogRepository;
    }

    @Scheduled(cron = "0 0 3 * * *")
    public void fetchAndStoreJobs() {
        int count = 0;

        // --- API 1: Arbeitnow (pages 1 and 2) ---
        for (int page = 1; page <= 2; page++) {
            try {
                String body = arbeitnowClient.get()
                        .uri("/api/job-board-api?page=" + page)
                        .retrieve()
                        .bodyToMono(String.class)
                        .retryWhen(RETRY_BACKOFF)
                        .block(OVERALL_TIMEOUT);

                JsonNode root = objectMapper.readTree(body);
                JsonNode data = root.path("data");
                if (data.isArray()) {
                    for (JsonNode node : data) {
                        try {
                            String jobUrl = node.path("url").asText();
                            if (jobUrl.isBlank() || jobCatalogRepository.existsByJobUrl(jobUrl)) continue;

                            List<String> tags = new ArrayList<>();
                            for (JsonNode t : node.path("tags")) tags.add(t.asText());

                            boolean remote = node.path("remote").asBoolean(false);
                            String location = remote ? "Remote" : node.path("location").asText("Remote");
                            if (!remote && location.toLowerCase().contains("remote")) remote = true;

                            String rawDesc = node.path("description").asText("");
                            String description = rawDesc.length() > 500 ? rawDesc.substring(0, 500) : rawDesc;

                            List<String> jobTypes = new ArrayList<>();
                            for (JsonNode jt : node.path("job_types")) jobTypes.add(jt.asText());

                            JobCatalog job = new JobCatalog();
                            job.setTitle(node.path("title").asText());
                            job.setCompany(node.path("company_name").asText());
                            job.setLocation(location);
                            job.setDescription(description);
                            job.setRequiredSkills(joinTagsMax10(tags));
                            job.setIndustry(inferIndustry(tags));
                            job.setCareerLevel("MID");
                            job.setWorkType(remote ? "REMOTE" : "HYBRID");
                            job.setJobUrl(jobUrl);
                            job.setSource("SCRAPED");
                            job.setActive(true);
                            job.setSubmittedBy(null);

                            jobCatalogRepository.save(job);
                            count++;
                        } catch (Exception e) {
                            log.warn("Failed to process Arbeitnow job entry: {}", e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch Arbeitnow page {}: {}", page, e.getMessage());
            }
        }

        // --- API 2: RemoteOK ---
        try {
            String body = remoteOkClient.get()
                    .uri("/api")
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(RETRY_BACKOFF)
                    .block(OVERALL_TIMEOUT);

            JsonNode array = objectMapper.readTree(body);
            boolean first = true;
            if (array.isArray()) {
                for (JsonNode node : array) {
                    if (first) { first = false; continue; } // skip legal notice

                    try {
                        String jobUrl = node.path("url").asText();
                        if (jobUrl.isBlank() || jobCatalogRepository.existsByJobUrl(jobUrl)) continue;

                        List<String> tags = new ArrayList<>();
                        for (JsonNode t : node.path("tags")) tags.add(t.asText());

                        String location = node.path("location").asText("Remote");
                        boolean remote = location.toLowerCase().contains("remote");

                        String rawDesc = node.path("description").asText("");
                        String description = rawDesc.length() > 500 ? rawDesc.substring(0, 500) : rawDesc;

                        JobCatalog job = new JobCatalog();
                        job.setTitle(node.path("position").asText());
                        job.setCompany(node.path("company").asText());
                        job.setLocation(location);
                        job.setDescription(description);
                        job.setRequiredSkills(joinTagsMax10(tags));
                        job.setIndustry(inferIndustry(tags));
                        job.setCareerLevel("MID");
                        job.setWorkType(remote ? "REMOTE" : "HYBRID");
                        job.setJobUrl(jobUrl);
                        job.setSource("SCRAPED");
                        job.setActive(true);
                        job.setSubmittedBy(null);

                        jobCatalogRepository.save(job);
                        count++;
                    } catch (Exception e) {
                        log.warn("Failed to process RemoteOK job entry: {}", e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch RemoteOK jobs: {}", e.getMessage());
        }

        log.info("Fetched {} new jobs", count);
    }

    public int fetchNow() {
        int[] count = {0};
        int before = (int) jobCatalogRepository.count();
        fetchAndStoreJobs();
        int after = (int) jobCatalogRepository.count();
        return after - before;
    }

    private String joinTagsMax10(List<String> tags) {
        List<String> capped = tags.size() > 10 ? tags.subList(0, 10) : tags;
        return String.join(",", capped);
    }

    private String inferIndustry(List<String> tags) {
        String combined = String.join(",", tags).toLowerCase();
        if (combined.contains("java") || combined.contains("spring") ||
            combined.contains("angular") || combined.contains("python") ||
            combined.contains("devops")) {
            return "Technology";
        }
        if (combined.contains("finance") || combined.contains("banking")) {
            return "Finance";
        }
        return "Technology";
    }
}
