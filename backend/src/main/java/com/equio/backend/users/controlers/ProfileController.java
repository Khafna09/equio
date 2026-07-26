package com.equio.backend.users.controlers;

import com.equio.backend.users.dto.requests.ProfileRequest;
import com.equio.backend.users.dto.responses.ProfileResponse;
import com.equio.backend.users.services.ProfileService;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profiles")
@Tag(name = "Profiles", description = "Endpoints para la gestion del perfil de usuario")
@SecurityRequirement(name = "Bearer Authentication")
public class ProfileController {

    private final ProfileService profileService;
    private final UserService userService;

    public ProfileController(ProfileService profileService, UserService userService) {
        this.profileService = profileService;
        this.userService = userService;
    }

    @Operation(summary = "Obtener mi perfil", description = "Obtiene el perfil del usuario autenticado actualmente")
    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        var profile = profileService.getProfileByUserId(user.getId());
        return ResponseEntity.ok(new ProfileResponse(
                profile.getId(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getLanguage(),
                profile.getCurrency(),
                profile.getTheme()
        ));
    }

    @Operation(summary = "Actualizar mi perfil", description = "Actualiza los datos del perfil del usuario autenticado")
    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMyProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ProfileRequest request) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        var profile = profileService.updateProfile(user.getId(), request);
        return ResponseEntity.ok(new ProfileResponse(
                profile.getId(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getLanguage(),
                profile.getCurrency(),
                profile.getTheme()
        ));
    }
}