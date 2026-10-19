package com.equio.backend.shared.security;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import static org.junit.jupiter.api.Assertions.*;

class RequestIdFilterTest {
    @Test
    void logsOnlyRouteTemplateStatusDurationAndRequestId() throws Exception {
        var logger = (Logger) LoggerFactory.getLogger(RequestIdFilter.class);
        var appender = new ListAppender<ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        try {
            var request = new MockHttpServletRequest("POST", "/api/v1/movements/12345");
            request.setQueryString("note=private-query");
            request.addHeader("Authorization", "Bearer private-token");
            request.addHeader("X-Request-Id", "audit-request");
            request.setContent("private-body@example.test".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/v1/movements/{id}");
            var response = new MockHttpServletResponse();
            new RequestIdFilter(true, 2000).doFilter(request, response, (req, res) -> response.setStatus(503));
            String log = appender.list.getFirst().getFormattedMessage();
            assertTrue(log.contains("route=/api/v1/movements/{id} status=503"));
            assertTrue(log.contains("requestId=" + response.getHeader("X-Request-Id")));
            assertFalse(log.contains("12345"));
            assertFalse(log.contains("private-"));
            assertNull(MDC.get("requestId"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
