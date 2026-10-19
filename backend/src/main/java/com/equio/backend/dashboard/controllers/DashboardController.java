package com.equio.backend.dashboard.controllers;

import com.equio.backend.dashboard.dto.responses.DashboardSummaryResponse;
import com.equio.backend.dashboard.services.DashboardService;
import com.equio.backend.dashboard.dto.DashboardPeriod;
import org.springframework.format.annotation.DateTimeFormat;
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
                    Devuelve el resumen financiero para AUTO, BUDGET, MONTH, FORTNIGHT o WEEK.
                    AUTO usa el general activo o, si no existe, el mes de referenceDate (hoy por defecto).
                    BUDGET usa las fechas reales del ciclo y vuelve a MONTH si se cierra o elimina.
                    FORTNIGHT usa los dias 1-15 o 16-fin de mes; WEEK usa lunes-domingo.
                    startDate y endDate indican el rango inclusivo aplicado a todos los movimientos.

                    Incluye:
                    - `totalIncome`: Total de ingresos del periodo
                    - `totalExpense`: Total de gastos del periodo
                    - `balance`: En BUDGET, limite menos ahorro y gastos, sin sumar ingresos.
                      En los periodos calendario, ingresos menos gastos.
                    - `globalBudgetAmount`: Limite del general activo, o null. Nunca toma presupuestos cerrados.
                    - `savingsDeduction`: Reserva en la vista BUDGET, o null.
                    - `hasActiveBudget`: Indica si se puede seleccionar BUDGET.
                    - `expenseCategories`: Todas las categorías con gastos, para el gráfico circular
                    - `topCategories`: Top 3 categorías donde más se gastó, con su porcentaje del total

                    month y year se conservan para consultas mensuales anteriores. No deben combinarse
                    con referenceDate ni con un period distinto de MONTH o AUTO.

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
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer year,
            @RequestParam(defaultValue = "AUTO") DashboardPeriod period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate) {

        var user = userService.requireAuthenticated(userDetails.getUsername());

        LocalDate anchor = referenceDate != null ? referenceDate : LocalDate.now();
        if (month != null || year != null) {
            if (referenceDate != null || (period != DashboardPeriod.MONTH && period != DashboardPeriod.AUTO)) {
                throw new IllegalArgumentException("Monthly parameters cannot be combined with another period or referenceDate");
            }
            anchor = LocalDate.of(year != null ? year : anchor.getYear(), month != null ? month : anchor.getMonthValue(), 1);
            period = DashboardPeriod.MONTH;
        }
        if (anchor.getYear() < 2000 || anchor.getYear() > 2100) {
            throw new IllegalArgumentException("referenceDate year must be between 2000 and 2100");
        }

        return ResponseEntity.ok(dashboardService.getSummary(user.getId(), period, anchor));
    }
}
