package com.equio.backend.images;

import com.equio.backend.shared.exceptions.ExternalServiceException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.*;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

@Service
public class UnsplashImageService {
    private final RestClient restClient;
    private final String accessKey;

    public UnsplashImageService(@Value("${app.unsplash.access-key:}") String accessKey) {
        var httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
                .baseUrl("https://api.unsplash.com")
                .requestFactory(requestFactory)
                .build();
        this.accessKey = accessKey;
    }

    public ImageSearchResponse findLandscapeImage(String query) {
        if (accessKey.isBlank()) {
            throw new ExternalServiceException("Image search is not available.");
        }

        UnsplashSearchResponse response;
        try {
            response = restClient.get()
                    .uri(builder -> builder
                            .path("/search/photos")
                            .queryParam("query", query.trim())
                            .queryParam("orientation", "landscape")
                            .queryParam("per_page", 5)
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "Client-ID " + accessKey)
                    .retrieve()
                    .body(UnsplashSearchResponse.class);
        } catch (RestClientException exception) {
            throw new ExternalServiceException("Image search is temporarily unavailable.", exception);
        }

        if (response == null || response.results() == null) {
            throw new ResourceNotFoundException("Image");
        }

        return response.results().stream()
                .map(Result::urls)
                .filter(java.util.Objects::nonNull)
                .map(urls -> urls.regular() != null ? urls.regular() : urls.small())
                .filter(java.util.Objects::nonNull)
                .filter(this::isAllowedImageUrl)
                .findFirst()
                .map(ImageSearchResponse::new)
                .orElseThrow(() -> new ResourceNotFoundException("Image"));
    }

    private boolean isAllowedImageUrl(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "images.unsplash.com".equalsIgnoreCase(uri.getHost())
                    && uri.getUserInfo() == null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public record ImageSearchResponse(String url) {
    }

    private record UnsplashSearchResponse(List<Result> results) {
    }

    private record Result(Urls urls) {
    }

    private record Urls(String regular, String small) {
    }
}
