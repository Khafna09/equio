package com.equio.backend.shared.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

@Component
@Profile("prod")
public class ProductionSecurityValidator {
    private final String databaseUrl;
    private final String migrationDatabaseUrl;
    private final String applicationUser;
    private final String migrationUser;
    private final List<String> allowedOrigins;
    private final boolean requireHttps;
    private final boolean secureCookie;
    private final boolean swaggerPublic;
    private final String jwtKey;
    private final String metadataHashKey;
    private final String jwtIssuer;
    private final String jwtAudience;

    public ProductionSecurityValidator(
            @Value("${spring.datasource.url}") String databaseUrl,
            @Value("${spring.flyway.url}") String migrationDatabaseUrl,
            @Value("${spring.datasource.username}") String applicationUser,
            @Value("${spring.flyway.user}") String migrationUser,
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins,
            @Value("${app.security.require-https}") boolean requireHttps,
            @Value("${app.refresh-token.cookie-secure}") boolean secureCookie,
            @Value("${app.security.swagger-public}") boolean swaggerPublic,
            @Value("${app.jwt.secret-base64}") String jwtKey,
            @Value("${app.security.metadata-hash-key-base64}") String metadataHashKey,
            @Value("${app.jwt.issuer}") String jwtIssuer,
            @Value("${app.jwt.audience}") String jwtAudience
    ) {
        this.databaseUrl = databaseUrl;
        this.migrationDatabaseUrl = migrationDatabaseUrl;
        this.applicationUser = applicationUser;
        this.migrationUser = migrationUser;
        this.allowedOrigins = allowedOrigins;
        this.requireHttps = requireHttps;
        this.secureCookie = secureCookie;
        this.swaggerPublic = swaggerPublic;
        this.jwtKey = jwtKey;
        this.metadataHashKey = metadataHashKey;
        this.jwtIssuer = jwtIssuer;
        this.jwtAudience = jwtAudience;
    }

    @PostConstruct
    void validate() {
        if (!isSecurePostgresUrl(databaseUrl)
                || !isSecurePostgresUrl(migrationDatabaseUrl)) {
            throw new IllegalStateException(
                    "Production database URLs must use PostgreSQL with sslmode=verify-full");
        }
        if (applicationUser.isBlank()
                || migrationUser.isBlank()
                || "postgres".equalsIgnoreCase(applicationUser)
                || applicationUser.equals(migrationUser)) {
            throw new IllegalStateException(
                    "Production requires separate least-privileged application credentials");
        }
        byte[] jwtKeyBytes = decodeKey(jwtKey, "JWT");
        byte[] metadataKeyBytes = decodeKey(metadataHashKey, "metadata HMAC");
        if (Arrays.equals(jwtKeyBytes, metadataKeyBytes)) {
            throw new IllegalStateException(
                    "Production JWT and metadata HMAC keys must be different");
        }
        if (jwtIssuer.isBlank()
                || jwtAudience.isBlank()
                || jwtIssuer.equals(jwtAudience)) {
            throw new IllegalStateException(
                    "Production JWT issuer and audience must be non-empty and different");
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
                    || "localhost".equalsIgnoreCase(uri.getHost())
                    || uri.getUserInfo() != null
                    || uri.getQuery() != null
                    || uri.getFragment() != null
                    || (uri.getPath() != null && !uri.getPath().isEmpty());
        } catch (IllegalArgumentException exception) {
            return true;
        }
    }

    private boolean isSecurePostgresUrl(String url) {
        if (!url.startsWith("jdbc:")) {
            return false;
        }
        try {
            URI uri = URI.create(url.substring("jdbc:".length()));
            String query = uri.getRawQuery();
            return "postgresql".equalsIgnoreCase(uri.getScheme())
                    && uri.getHost() != null
                    && uri.getUserInfo() == null
                    && queryParameterEqualsOnce(query, "sslmode", "verify-full")
                    && !hasQueryParameter(query, "user")
                    && !hasQueryParameter(query, "password");
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean queryParameterEqualsOnce(
            String query,
            String expectedName,
            String expectedValue
    ) {
        if (query == null) {
            return false;
        }
        List<String> values = Arrays.stream(query.split("&"))
                .map(parameter -> parameter.split("=", 2))
                .filter(parts -> parts[0].equalsIgnoreCase(expectedName))
                .map(parts -> parts.length == 2 ? parts[1] : "")
                .toList();
        return values.size() == 1
                && expectedValue.equalsIgnoreCase(values.getFirst());
    }

    private boolean hasQueryParameter(String query, String expectedName) {
        return query != null && Arrays.stream(query.split("&"))
                .map(parameter -> parameter.split("=", 2)[0])
                .anyMatch(name -> name.equalsIgnoreCase(expectedName));
    }

    private byte[] decodeKey(String encodedKey, String label) {
        try {
            byte[] decoded = Base64.getDecoder().decode(encodedKey);
            if (decoded.length < 32) {
                throw new IllegalStateException(
                        "Production " + label + " key must contain at least 32 bytes");
            }
            return decoded;
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Production " + label + " key must be valid Base64", exception);
        }
    }
}
