package com.equio.backend.dashboard.controllers;

import com.equio.backend.dashboard.dto.responses.DashboardSummaryResponse;
import com.equio.backend.dashboard.services.DashboardService;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@Validated
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "Endpoint para obtener el resumen financiero del período")
@SecurityRequirement(name = "Bearer Authentication")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;

    public DashboardController(DashboardService dashboardService, UserService userService) {
        this.dashboardService = dashboardService;
        this.userService = userService;
    }

    @Operation(
            summary = "Resumen del dashboard",
            description = """
                    Devuelve el resumen financiero del usuario para el mes y año indicados.

                    Incluye:
                    - `totalIncome`: Total de ingresos del mes
                    - `totalExpense`: Total de gastos del mes
                    - `balance`: Diferencia (ingresos - gastos)
                    - `expenseCategories`: Todas las categorías con gastos, para el gráfico circular
                    - `topCategories`: Top 3 categorías donde más se gastó, con su porcentaje del total

                    Si no se especifica `month` ni `year`, se usa el mes y año actuales.

                    Ejemplo: `GET /api/v1/dashboard/summary?month=7&year=2025`
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Resumen calculado exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) @Min(1) @Max(12) Integer month,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer year) {

        var user = userService.requireAuthenticated(userDetails.getUsername());

        int targetMonth = (month != null) ? month : LocalDate.now().getMonthValue();
        int targetYear = (year != null) ? year : LocalDate.now().getYear();

        return ResponseEntity.ok(dashboardService.getSummary(user.getId(), targetMonth, targetYear));
    }
}
