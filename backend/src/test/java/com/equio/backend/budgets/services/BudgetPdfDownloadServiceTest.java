package com.equio.backend.budgets.services;

import com.equio.backend.shared.exceptions.ReportBusyException;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BudgetPdfDownloadServiceTest {
    @Test
    void rejectsConcurrentReportsBeforeLoadingDataAndReleasesPermit() throws Exception {
        var reports = mock(BudgetHistoryReportService.class);
        var renderer = mock(BudgetHistoryPdfService.class);
        var service = new BudgetPdfDownloadService(reports, renderer, 1);
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(reports.getReport(1L, 10L)).thenAnswer(invocation -> {
            entered.countDown();
            assertTrue(release.await(5, TimeUnit.SECONDS));
            return null;
        });
        when(renderer.generate(1L, null)).thenReturn(new byte[]{1});
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = executor.submit(() -> service.download(1L, 10L));
            try {
                assertTrue(entered.await(5, TimeUnit.SECONDS));
                assertThrows(ReportBusyException.class, () -> service.download(2L, 20L));
                verify(reports, never()).getReport(2L, 20L);
            } finally { release.countDown(); }
            assertArrayEquals(new byte[]{1}, first.get(5, TimeUnit.SECONDS));
        }
        assertArrayEquals(new byte[]{1}, service.download(1L, 10L));
    }

    @Test
    void failuresDoNotLeakPermitsAndConfigurationIsBounded() {
        var reports = mock(BudgetHistoryReportService.class);
        var renderer = mock(BudgetHistoryPdfService.class);
        var service = new BudgetPdfDownloadService(reports, renderer, 1);
        when(reports.getReport(1L, 10L)).thenThrow(new IllegalArgumentException("Test failure")).thenReturn(null);
        when(renderer.generate(1L, null)).thenReturn(new byte[]{1});
        assertThrows(IllegalArgumentException.class, () -> service.download(1L, 10L));
        assertArrayEquals(new byte[]{1}, service.download(1L, 10L));
        assertThrows(IllegalStateException.class, () -> new BudgetPdfDownloadService(reports, renderer, 0));
        assertThrows(IllegalStateException.class, () -> new BudgetPdfDownloadService(reports, renderer, 5));
    }
}
