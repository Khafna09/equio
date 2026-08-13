package com.equio.backend.transactions.controllers;

import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.dto.responses.MovementResponse;
import com.equio.backend.transactions.services.CreateMovementService;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/movements")
@Tag(name = "Movements", description = "Endpoints para la gestión de ingresos y gastos (Movimientos)")
@SecurityRequirement(name = "Bearer Authentication")
public class MovementController {

    private final CreateMovementService movementService;
    private final UserService userService;

    public MovementController(CreateMovementService movementService, UserService userService) {
        this.movementService = movementService;
        this.userService = userService;
    }

    @Operation(summary = "Registrar un movimiento", description = "Crea un nuevo ingreso o gasto asociado al usuario autenticado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Movimiento creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos (ej. monto negativo, categoría inexistente)"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PostMapping
    public ResponseEntity<MovementResponse> createMovement(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateMovementRequest request) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        var response = movementService.createMovement(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Listar movimientos", description = "Obtiene los movimientos del usuario con soporte opcional para filtros (tipo, categoría, fechas)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista obtenida exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping
    public ResponseEntity<List<MovementResponse>> getAllMovements(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @Pattern(regexp = "(?i)INCOME|EXPENSE") String type,
            @RequestParam(required = false) @Positive Long categoryId,
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(movementService.getAllByFilters(user.getId(), type, categoryId, startDate, endDate));
    }

    @Operation(summary = "Obtener movimiento por ID", description = "Devuelve el detalle de un movimiento específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Movimiento encontrado"),
            @ApiResponse(responseCode = "404", description = "Movimiento no encontrado o no pertenece al usuario"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<MovementResponse> getMovementById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(movementService.getById(user.getId(), id));
    }

    @Operation(summary = "Actualizar movimiento", description = "Actualiza los datos de un ingreso o gasto existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Movimiento actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Movimiento no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<MovementResponse> updateMovement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @Valid @RequestBody CreateMovementRequest request) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(movementService.updateMovement(user.getId(), id, request));
    }

    @Operation(summary = "Eliminar movimiento", description = "Elimina un ingreso o gasto por su ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Movimiento eliminado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Movimiento no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMovement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.findByEmail(userDetails.getUsername()).orElseThrow();
        movementService.deleteMovement(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
