package com.equio.backend.transactions.controllers;

import com.equio.backend.transactions.dto.requests.CategoryRequest;
import com.equio.backend.transactions.dto.responses.CategoryResponse;
import com.equio.backend.transactions.services.CategoryService;
import com.equio.backend.shared.exceptions.UnauthorizedException;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/categories")
@Tag(name = "Categories", description = "Endpoints para la gestión de categorías de gastos e ingresos")
@SecurityRequirement(name = "Bearer Authentication")
public class CategoryController {

    private final CategoryService categoryService;
    private final UserService userService;

    public CategoryController(CategoryService categoryService, UserService userService) {
        this.categoryService = categoryService;
        this.userService = userService;
    }

    private User getAuthenticatedUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new UnauthorizedException("Authentication is no longer valid.");
        }
        return userService.requireAuthenticated(userDetails.getUsername());
    }

    @Operation(summary = "Crear nueva categoría", description = "Crea una nueva categoría para el usuario autenticado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Categoría creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Nombre duplicado o datos de entrada inválidos"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CategoryRequest request) {
        var user = getAuthenticatedUser(userDetails);
        var response = categoryService.createCategory(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Listar todas las categorías del usuario", description = "Obtiene todas las categorías asociadas al usuario autenticado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de categorías obtenida exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories(
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(categoryService.getAllByUserId(user.getId()));
    }

    @Operation(summary = "Obtener categoría por ID", description = "Obtiene los detalles de una categoría específica por su ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Categoría encontrada"),
            @ApiResponse(responseCode = "404", description = "Categoría no encontrada o no pertenece al usuario"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(categoryService.getById(user.getId(), id));
    }

    @Operation(summary = "Actualizar categoría", description = "Actualiza el nombre, color o ícono de una categoría existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Categoría actualizada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos o nombre duplicado"),
            @ApiResponse(responseCode = "404", description = "Categoría no encontrada"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @Valid @RequestBody CategoryRequest request) {
        var user = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(categoryService.updateCategory(user.getId(), id, request));
    }

    @Operation(summary = "Eliminar categoría", description = "Elimina una categoría del usuario por su ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Categoría eliminada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Categoría no encontrada"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = getAuthenticatedUser(userDetails);
        categoryService.deleteCategory(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
