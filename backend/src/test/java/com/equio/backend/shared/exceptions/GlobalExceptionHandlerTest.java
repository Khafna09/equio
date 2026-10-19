package com.equio.backend.shared.exceptions;

import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.transaction.TransactionTimedOutException;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {
    @Test
    void busyReportsHaveASafeRetryableCode() {
        var response = new GlobalExceptionHandler().reportBusy(new ReportBusyException(), new MockHttpServletRequest());
        assertEquals(503, response.getStatusCode().value());
        assertEquals("5", response.getHeaders().getFirst("Retry-After"));
        assertEquals("REPORT_BUSY", response.getBody().get("code"));
    }

    @Test
    void databaseTimeoutResponseHasNoSqlOrInternalDetails() {
        var handler = new GlobalExceptionHandler();
        for (RuntimeException exception : new RuntimeException[]{
                new QueryTimeoutException("private SQL detail"),
                new PessimisticLockingFailureException("private lock detail"),
                new TransactionTimedOutException("private transaction detail")}) {
            var response = handler.timedOut(exception, new MockHttpServletRequest("POST", "/api/v1/movements"));
            assertEquals(503, response.getStatusCode().value());
            assertEquals("3", response.getHeaders().getFirst("Retry-After"));
            assertNotNull(response.getBody());
            assertEquals("OPERATION_TIMEOUT", response.getBody().get("code"));
            assertFalse(response.getBody().toString().contains("private"));
        }
    }
}
