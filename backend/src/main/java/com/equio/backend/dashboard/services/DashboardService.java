package com.equio.backend.dashboard.services;

import com.equio.backend.dashboard.dto.responses.DashboardSummaryResponse;
import java.time.LocalDate;
import com.equio.backend.dashboard.dto.DashboardPeriod;

public interface DashboardService {

    DashboardSummaryResponse getSummary(Long userId, DashboardPeriod period, LocalDate referenceDate);
}
