package com.equio.backend.transactions.services;

import com.equio.backend.transactions.dto.responses.DashboardSummaryResponse;

public interface DashboardService {

    /**
     * Calcula el resumen del dashboard para el mes y año indicados.
     * Devuelve ingresos totales, gastos totales, balance y top 3 categorías de gasto.
     */
    DashboardSummaryResponse getSummary(Long userId, int month, int year);
}
