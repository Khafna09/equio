package com.equio.backend.dashboard.services;

import com.equio.backend.dashboard.dto.responses.DashboardSummaryResponse;

public interface DashboardService {

    /**
     * Calcula el resumen del dashboard para el mes y año indicados.
     * Devuelve ingresos totales, gastos totales, balance y top 3 categorías de gasto.
     */
    DashboardSummaryResponse getSummary(Long userId, int month, int year);
}
