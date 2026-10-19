package com.equio.backend.savings.controllers;

import com.equio.backend.savings.dto.requests.FundRequest;
import com.equio.backend.savings.dto.requests.SavingGoalRequest;
import com.equio.backend.savings.dto.responses.SavingGoalResponse;
import com.equio.backend.savings.services.SavingGoalService;
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
@RequestMapping("/api/v1/savings")
@Tag(name = "Savings", description = "Endpoints para gestión de metas de ahorro")
@SecurityRequirement(name = "Bearer Authentication")
public class SavingGoalController {

    private final SavingGoalService savingGoalService;
    private final UserService userService;

    public SavingGoalController(SavingGoalService savingGoalService, UserService userService) {
        this.savingGoalService = savingGoalService;
        this.userService = userService;
    }

    @Operation(
            summary = "Crear meta de ahorro",
            description = """
                    Crea una nueva meta de ahorro para el usuario autenticado.
                    
                    `budgetId` es opcional: vincula la meta a un presupuesto existente.
                    Si el presupuesto se elimina, la meta también se eliminará.
                    
                    Ejemplo de body:
                    ```json
                    {
                      "name": "Viaje a Europa",
                      "targetAmount": 3000.00,
                      "deadline": "2025-12-31",
                      "budgetId": null
                    }
                    ```
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Meta creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos o presupuesto no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PostMapping
    public ResponseEntity<SavingGoalResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SavingGoalRequest request) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(savingGoalService.create(user.getId(), request));
    }

    @Operation(
            summary = "Listar metas de ahorro",
            description = "Devuelve todas las metas de ahorro del usuario autenticado con su progreso calculado."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista obtenida exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping
    public ResponseEntity<List<SavingGoalResponse>> getAll(
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(savingGoalService.getAllByUser(user.getId()));
    }

    @Operation(
            summary = "Obtener meta de ahorro por ID",
            description = "Devuelve el detalle de una meta de ahorro específica."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Meta encontrada"),
            @ApiResponse(responseCode = "404", description = "Meta no encontrada"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<SavingGoalResponse> getById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(savingGoalService.getById(user.getId(), id));
    }

    @Operation(
            summary = "Actualizar meta de ahorro",
            description = """
                    Actualiza el nombre, monto objetivo, deadline o presupuesto vinculado de una meta.
                    
                    Ejemplo de body:
                    ```json
                    {
                      "name": "Viaje a Japón",
                      "targetAmount": 5000.00,
                      "deadline": "2026-06-15",
                      "budgetId": 2
                    }
                    ```
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Meta actualizada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Meta no encontrada"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<SavingGoalResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @Valid @RequestBody SavingGoalRequest request) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(savingGoalService.update(user.getId(), id, request));
    }

    @Operation(
            summary = "Aportar o retirar fondos",
            description = """
                    Modifica el `currentAmount` de una meta de ahorro.
                    
                    - `operation: "ADD"` → suma el monto (no puede superar `targetAmount`)
                    - `operation: "WITHDRAW"` → resta el monto (no puede quedar negativo)
                    
                    Ejemplo para aportar:
                    ```json
                    { "amount": 200.00, "operation": "ADD" }
                    ```
                    
                    Ejemplo para retirar:
                    ```json
                    { "amount": 50.00, "operation": "WITHDRAW" }
                    ```
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Fondos actualizados exitosamente"),
            @ApiResponse(responseCode = "400", description = "Monto inválido o excede el límite permitido"),
            @ApiResponse(responseCode = "404", description = "Meta no encontrada"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PostMapping("/{id}/fund")
    public ResponseEntity<SavingGoalResponse> fund(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @Valid @RequestBody FundRequest request) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(savingGoalService.addOrWithdrawFund(user.getId(), id, request));
    }

    @Operation(
            summary = "Eliminar meta de ahorro",
            description = "Elimina una meta de ahorro del usuario."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Meta eliminada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Meta no encontrada"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        savingGoalService.delete(user.getId(), id);
        return ResponseEntity.noContent().build();
    }
}
