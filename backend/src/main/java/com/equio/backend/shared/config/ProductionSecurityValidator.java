package com.equio.backend.shared.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;

@Component
@Profile("prod")
public class ProductionSecurityValidator {
    private final String databaseUrl;
    private final String applicationUser;
    private final String migrationUser;
    private final List<String> allowedOrigins;
    private final boolean requireHttps;
    private final boolean secureCookie;
    private final boolean swaggerPublic;
    private final String jwtKey;
    private final String metadataHashKey;

    public ProductionSecurityValidator(
            @Value("${spring.datasource.url}") String databaseUrl,
            @Value("${spring.datasource.username}") String applicationUser,
            @Value("${spring.flyway.user}") String migrationUser,
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins,
            @Value("${app.security.require-https}") boolean requireHttps,
            @Value("${app.refresh-token.cookie-secure}") boolean secureCookie,
            @Value("${app.security.swagger-public}") boolean swaggerPublic,
            @Value("${app.jwt.secret-base64}") String jwtKey,
            @Value("${app.security.metadata-hash-key-base64}") String metadataHashKey
    ) {
        this.databaseUrl = databaseUrl;
        this.applicationUser = applicationUser;
        this.migrationUser = migrationUser;
        this.allowedOrigins = allowedOrigins;
        this.requireHttps = requireHttps;
        this.secureCookie = secureCookie;
        this.swaggerPublic = swaggerPublic;
        this.jwtKey = jwtKey;
        this.metadataHashKey = metadataHashKey;
    }

    @PostConstruct
    void validate() {
        if (!databaseUrl.contains("sslmode=verify-full")) {
            throw new IllegalStateException(
                    "Production DB_URL must use sslmode=verify-full");
        }
        if ("postgres".equalsIgnoreCase(applicationUser)
                || applicationUser.equals(migrationUser)) {
            throw new IllegalStateException(
                    "Production requires separate least-privileged application credentials");
        }
        if (jwtKey.equals(metadataHashKey)) {
            throw new IllegalStateException(
                    "Production JWT and metadata HMAC keys must be different");
        }
        if (!requireHttps || !secureCookie || swaggerPublic) {
            throw new IllegalStateException(
                    "Production HTTPS, secure cookies and private Swagger settings are required");
        }
        if (allowedOrigins.isEmpty()
                || allowedOrigins.stream().anyMatch(this::isUnsafeOrigin)) {
            throw new IllegalStateException(
                    "Production CORS origins must be explicit HTTPS origins");
        }
    }

    private boolean isUnsafeOrigin(String origin) {
        try {
            URI uri = URI.create(origin);
            return !"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null
                    || origin.contains("*")
                    || "localhost".equalsIgnoreCase(uri.getHost());
        } catch (IllegalArgumentException exception) {
            return true;
        }
    }
}
