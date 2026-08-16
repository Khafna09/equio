package com.equio.backend.images;

import com.equio.backend.shared.exceptions.ExternalServiceException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class UnsplashImageServiceTest {

    @Test
    void reportsUnavailableServiceWhenAccessKeyIsMissing() {
        UnsplashImageService service = new UnsplashImageService(" ");

        assertThrows(ExternalServiceException.class,
                () -> service.findLandscapeImage("savings goal"));
    }
}
