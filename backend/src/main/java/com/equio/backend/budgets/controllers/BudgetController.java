package com.equio.backend.budgets.controllers;

import com.equio.backend.budgets.dto.requests.BudgetRequest;
import com.equio.backend.budgets.dto.requests.BudgetModeRequest;
import com.equio.backend.budgets.dto.responses.BudgetResponse;
import com.equio.backend.budgets.dto.responses.BudgetCapabilitiesResponse;
import com.equio.backend.budgets.dto.responses.BudgetLinkPreviewResponse;
import com.equio.backend.budgets.dto.responses.BudgetModeResponse;
import com.equio.backend.budgets.dto.responses.BudgetHistoryReportResponse;
import com.equio.backend.budgets.services.BudgetService;
import com.equio.backend.budgets.services.BudgetHistoryReportService;
import com.equio.backend.budgets.services.BudgetPdfDownloadService;
import com.equio.backend.budgets.services.BudgetLinkService;
import com.equio.backend.budgets.services.AdvancedBudgetAccessService;
import com.equio.backend.budgets.services.BudgetModeService;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.ContentDisposition;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/budgets")
@Tag(name = "Budgets", description = "Endpoints para gestión de presupuestos mensuales y continuos")
@SecurityRequirement(name = "Bearer Authentication")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserService userService;
    private final BudgetHistoryReportService budgetHistoryReportService;
    private final BudgetPdfDownloadService budgetPdfDownloadService;
    private final BudgetLinkService budgetLinkService;
    private final AdvancedBudgetAccessService advancedBudgetAccessService;
    private final BudgetModeService budgetModeService;

    public BudgetController(BudgetService budgetService,
                            UserService userService,
                            BudgetHistoryReportService budgetHistoryReportService,
                            BudgetPdfDownloadService budgetPdfDownloadService,
                            BudgetLinkService budgetLinkService,
                            AdvancedBudgetAccessService advancedBudgetAccessService,
                            BudgetModeService budgetModeService) {
        this.budgetService = budgetService;
        this.userService = userService;
        this.budgetHistoryReportService = budgetHistoryReportService;
        this.budgetPdfDownloadService = budgetPdfDownloadService;
        this.budgetLinkService = budgetLinkService;
        this.advancedBudgetAccessService = advancedBudgetAccessService;
        this.budgetModeService = budgetModeService;
    }

    @Operation(
            summary = "Crear presupuesto",
            description = """
                    Crea un nuevo presupuesto para el usuario autenticado.
                    
                    **Presupuesto fijo (isFixed=true):** No requiere fechas, es continuo.
                    
                    **Presupuesto por período (isFixed=false):** Requiere `startDate` y `endDate`.
                    
                    Si `categoryId` es `null`, el presupuesto es global (cubre todas las categorías).
                    
                    Ejemplo de body:
                    ```json
                    {
                      "name": "Gastos de comida",
                      "totalAmount": 500.00,
                      "isFixed": false,
                      "startDate": "2025-07-01",
                      "endDate": "2025-07-31",
                      "categoryId": 3,
                      "savingsPercentage": 10.0
                    }
                    ```
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Presupuesto creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos, nombre duplicado o fechas incorrectas"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PostMapping
    public ResponseEntity<BudgetResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BudgetRequest request) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(user.getId(), request));
    }

    @Operation(
            summary = "Listar presupuestos",
            description = "Devuelve todos los presupuestos del usuario autenticado, con el progreso de gasto calculado."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista obtenida exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping
    public ResponseEntity<List<BudgetResponse>> getAll(
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetService.getAllByUser(user.getId()));
    }

    @Operation(
            summary = "Listar historial de presupuestos",
            description = "Devuelve todos los presupuestos cerrados del usuario autenticado."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Historial obtenido exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping("/history")
    public ResponseEntity<List<BudgetResponse>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetService.getHistoryByUser(user.getId()));
    }

    @Operation(
            summary = "Consultar capacidades de presupuestos",
            description = "Indica si las operaciones del modo avanzado estan habilitadas por el servidor."
    )
    @GetMapping("/capabilities")
    public ResponseEntity<BudgetCapabilitiesResponse> getCapabilities(
            @AuthenticationPrincipal UserDetails userDetails) {
        userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(advancedBudgetAccessService.getCapabilities());
    }

    @Operation(
            summary = "Cambiar modo de presupuestos",
            description = "Persiste un unico modo por usuario. El modo normal exige resolver antes los presupuestos independientes activos."
    )
    @PutMapping("/mode")
    public ResponseEntity<BudgetModeResponse> changeMode(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody BudgetModeRequest request) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetModeService.changeMode(user.getId(), request.mode()));
    }

    @Operation(
            summary = "Previsualizar vinculacion",
            description = "Calcula el periodo, gasto asimilado y capacidad resultante sin modificar datos."
    )
    @GetMapping("/{id}/preview-link")
    public ResponseEntity<BudgetLinkPreviewResponse> previewLink(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @RequestParam @Positive Long globalId) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetLinkService.preview(user.getId(), globalId, id));
    }

    @Operation(summary = "Vincular presupuesto de categoria a un presupuesto global")
    @PostMapping("/{globalId}/children/{budgetId}")
    public ResponseEntity<BudgetResponse> linkBudget(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long globalId,
            @PathVariable @Positive Long budgetId) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetLinkService.link(user.getId(), globalId, budgetId));
    }

    @Operation(summary = "Convertir un presupuesto vinculado en independiente")
    @DeleteMapping("/{globalId}/children/{budgetId}")
    public ResponseEntity<BudgetResponse> detachBudget(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long globalId,
            @PathVariable @Positive Long budgetId) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetLinkService.detach(user.getId(), globalId, budgetId));
    }

    @Operation(
            summary = "Obtener reporte de un presupuesto cerrado",
            description = "Devuelve metricas consolidadas del ciclo y comparacion con el periodo anterior."
    )
    @GetMapping("/history/{id}/report")
    public ResponseEntity<BudgetHistoryReportResponse> getHistoryReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(budgetHistoryReportService.getReport(user.getId(), id));
    }

    @Operation(
            summary = "Descargar reporte historico en PDF",
            description = "Genera un PDF con el resumen y los indicadores del presupuesto cerrado."
    )
    @GetMapping(value = "/history/{id}/report.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadHistoryReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        byte[] pdf = budgetPdfDownloadService.download(user.getId(), id);
        String disposition = ContentDisposition.attachment()
                .filename("budget-report-" + id + ".pdf")
                .build()
                .toString();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .body(pdf);
    }
    @Operation(
            summary = "Obtener presupuesto por ID",
            description = "Devuelve el detalle de un presupuesto específico del usuario."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Presupuesto encontrado"),
            @ApiResponse(responseCode = "404", description = "Presupuesto no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<BudgetResponse> getById(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetService.getById(user.getId(), id));
    }

    @Operation(
            summary = "Actualizar presupuesto",
            description = """
                    Actualiza los datos de un presupuesto existente.
                    
                    Ejemplo de body:
                    ```json
                    {
                      "name": "Comida - Julio actualizado",
                      "totalAmount": 600.00,
                      "isFixed": false,
                      "startDate": "2025-07-01",
                      "endDate": "2025-07-31",
                      "categoryId": 3,
                      "savingsPercentage": 15.0
                    }
                    ```
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Presupuesto actualizado"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Presupuesto no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<BudgetResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @Valid @RequestBody BudgetRequest request) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetService.update(user.getId(), id, request));
    }

    @Operation(
            summary = "Eliminar presupuesto",
            description = "Elimina un presupuesto. En presupuestos cerrados conserva las metas y elimina solo su vinculacion historica."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Presupuesto eliminado"),
            @ApiResponse(responseCode = "404", description = "Presupuesto no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id,
            @RequestParam(defaultValue = "false") boolean cascade) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        budgetService.delete(user.getId(), id, cascade);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            summary = "Cerrar presupuesto",
            description = "Cambia el estado del presupuesto a CLOSED y aplica cierre en cascada a sub-presupuestos."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Presupuesto cerrado"),
            @ApiResponse(responseCode = "404", description = "Presupuesto no encontrado"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @PatchMapping("/{id}/close")
    public ResponseEntity<BudgetResponse> closeBudget(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable @Positive Long id) {
        var user = userService.requireAuthenticated(userDetails.getUsername());
        return ResponseEntity.ok(budgetService.closeBudget(user.getId(), id));
    }
}
