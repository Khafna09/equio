package com.equio.backend.images;

import jakarta.validation.constraints.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/images")
@Validated
public class ImageController {
    private final UnsplashImageService imageService;

    public ImageController(UnsplashImageService imageService) {
        this.imageService = imageService;
    }

    @GetMapping("/search")
    public UnsplashImageService.ImageSearchResponse search(
            @RequestParam
            @NotBlank
            @Size(max = 100)
            @Pattern(
                    regexp = "^[\\p{L}\\p{M}0-9 .,'-]+$",
                    message = "contains unsupported characters"
            )
            String query
    ) {
        return imageService.findLandscapeImage(query);
    }
}
