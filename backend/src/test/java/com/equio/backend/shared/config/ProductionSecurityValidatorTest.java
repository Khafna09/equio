package com.equio.backend.shared.config;

import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionSecurityValidatorTest {
    private static final String APP_URL =
            "jdbc:postgresql://equio-pooler.example/equio?sslmode=verify-full";
    private static final String MIGRATION_URL =
            "jdbc:postgresql://equio.example/equio?sslmode=verify-full";
    private static final String JWT_KEY = key((byte) 1);
    private static final String METADATA_KEY = key((byte) 2);

    @Test
    void acceptsASeparatedAndHardenedProductionConfiguration() {
        assertDoesNotThrow(() -> validValidator().validate());
    }

    @Test
    void acceptsSharedEndpointWithSeparateCredentials() {
        var validator = validator(
                APP_URL,
                APP_URL,
                List.of("https://app.equio.example"),
                JWT_KEY,
                METADATA_KEY
        );

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void rejectsCorsOriginsWithPaths() {
        var validator = validator(
                APP_URL,
                MIGRATION_URL,
                List.of("https://app.equio.example/login"),
                JWT_KEY,
                METADATA_KEY
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void rejectsCorsOriginsWithTrailingSlash() {
        var validator = validator(
                APP_URL,
                MIGRATION_URL,
                List.of("https://app.equio.example/"),
                JWT_KEY,
                METADATA_KEY
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void rejectsAmbiguousSslModeParameters() {
        var validator = validator(
                APP_URL + "&sslmode=disable",
                MIGRATION_URL,
                List.of("https://app.equio.example"),
                JWT_KEY,
                METADATA_KEY
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void rejectsEquivalentCryptographicKeys() {
        var validator = validator(
                APP_URL,
                MIGRATION_URL,
                List.of("https://app.equio.example"),
                JWT_KEY,
                JWT_KEY
        );

        assertThrows(IllegalStateException.class, validator::validate);
    }

    private ProductionSecurityValidator validValidator() {
        return validator(
                APP_URL,
                MIGRATION_URL,
                List.of("https://app.equio.example"),
                JWT_KEY,
                METADATA_KEY
        );
    }

    private ProductionSecurityValidator validator(
            String appUrl,
            String migrationUrl,
            List<String> origins,
            String jwtKey,
            String metadataKey
    ) {
        return new ProductionSecurityValidator(
                appUrl,
                migrationUrl,
                "equio_app",
                "equio_owner",
                origins,
                true,
                true,
                false,
                jwtKey,
                metadataKey,
                "equio-api",
                "equio-web"
        );
    }

    private static String key(byte value) {
        byte[] bytes = new byte[32];
        java.util.Arrays.fill(bytes, value);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
