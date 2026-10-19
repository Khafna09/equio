package com.equio.backend.budgets.services;

import com.equio.backend.shared.exceptions.ReportBusyException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.Semaphore;

@Service
public class BudgetPdfDownloadService {
    private final BudgetHistoryReportService reportService;
    private final BudgetHistoryPdfService pdfService;
    private final Semaphore permits;

    public BudgetPdfDownloadService(BudgetHistoryReportService reportService, BudgetHistoryPdfService pdfService,
            @Value("${app.reports.max-concurrent-pdfs:1}") int maxConcurrent) {
        if (maxConcurrent < 1 || maxConcurrent > 4) throw new IllegalStateException("Invalid PDF concurrency limit");
        this.reportService = reportService;
        this.pdfService = pdfService;
        this.permits = new Semaphore(maxConcurrent);
    }

    public byte[] download(Long userId, Long budgetId) {
        // Reject excess work before loading a report, rather than queuing request threads and DB connections.
        if (!permits.tryAcquire()) throw new ReportBusyException();
        try {
            return pdfService.generate(userId, reportService.getReport(userId, budgetId));
        } finally {
            permits.release();
        }
    }
}
