package com.equio.backend.dashboard.services;

import com.equio.backend.dashboard.dto.responses.DashboardSummaryResponse;
import java.time.LocalDate;
import com.equio.backend.dashboard.dto.DashboardPeriod;

public interface DashboardService {

    default DashboardSummaryResponse getSummary(Long userId, DashboardPeriod period, LocalDate referenceDate) {
        return getSummary(userId, period, referenceDate, null);
    }

    DashboardSummaryResponse getSummary(Long userId, DashboardPeriod period, LocalDate referenceDate,
                                        Long budgetId);
}
