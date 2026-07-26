package com.equio.backend.users.controlers;

import com.equio.backend.users.dto.requests.SignInRequest;
import com.equio.backend.users.dto.requests.SignUpRequest;
import com.equio.backend.users.dto.responses.JwtResponse;
import com.equio.backend.users.dto.responses.UserResponse;
import com.equio.backend.users.services.AuthService;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Endpoints para registro y login de usuarios")
public class AuthController {

    private final UserService userService;
    private final AuthService authService;

    public AuthController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @Operation(summary = "Registrar nuevo usuario", description = "Crea un nuevo usuario con rol USER por defecto y un perfil asociado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Usuario creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Email en uso o datos inválidos")
    })
    @PostMapping("/sign-up")
    public ResponseEntity<UserResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        var user = userService.registerUser(request);
        var roleNames = user.getRoles().stream()
                .map(role -> role.getName().name())
                .toList();
        
        return ResponseEntity.ok(new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getProfile().getFirstName(),
                user.getProfile().getLastName(),
                user.getProfile().getLanguage(),
                user.getProfile().getCurrency(),
                roleNames
        ));
    }

    @Operation(summary = "Iniciar sesión", description = "Inicia sesión y devuelve un token JWT con la información básica del usuario")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Sesión iniciada exitosamente, retorna JWT"),
            @ApiResponse(responseCode = "403", description = "Credenciales incorrectas")
    })
    @PostMapping("/sign-in")
    public ResponseEntity<JwtResponse> signIn(@Valid @RequestBody SignInRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }
}
