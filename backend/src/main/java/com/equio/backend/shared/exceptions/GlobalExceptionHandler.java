package com.equio.backend.shared.exceptions;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.transaction.TransactionTimedOutException;
import org.springframework.http.*;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger LOGGER =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({UnauthorizedException.class, BadCredentialsException.class})
    ResponseEntity<Map<String, Object>> unauthorized(
            RuntimeException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.UNAUTHORIZED, exception.getMessage(), request, null);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<Map<String, Object>> notFound(
            ResourceNotFoundException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage(), request, null);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    ResponseEntity<Map<String, Object>> tooManyRequests(
            TooManyRequestsException exception,
            HttpServletRequest request
    ) {
        return response(
                HttpStatus.TOO_MANY_REQUESTS,
                exception.getMessage(),
                request,
                exception.getRetryAfterSeconds()
        );
    }

    @ExceptionHandler({ReportTooLargeException.class, ResultSetTooLargeException.class})
    ResponseEntity<Map<String, Object>> reportTooLarge(
            RuntimeException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.CONTENT_TOO_LARGE, exception.getMessage(), request, null);
    }

    @ExceptionHandler(ExternalServiceException.class)
    ResponseEntity<Map<String, Object>> externalServiceUnavailable(
            ExternalServiceException exception,
            HttpServletRequest request
    ) {
        LOGGER.warn("External service request failed requestId={} type={}",
                MDC.get("requestId"), exception.getCause() != null
                        ? exception.getCause().getClass().getSimpleName()
                        : exception.getClass().getSimpleName());
        return response(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage(), request, null);
    }

    @ExceptionHandler(ReportGenerationException.class)
    ResponseEntity<Map<String, Object>> reportGenerationFailed(
            ReportGenerationException exception,
            HttpServletRequest request
    ) {
        LOGGER.error("Report generation failed requestId={} type={}", MDC.get("requestId"), exception.getClass().getSimpleName());
        return response(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage(), request, null);
    }

    @ExceptionHandler(ReportBusyException.class)
    ResponseEntity<Map<String, Object>> reportBusy(ReportBusyException exception, HttpServletRequest request) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage(), request, 5L,
                "REPORT_BUSY", Map.of());
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            ConstraintViolationException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class
    })
    ResponseEntity<Map<String, Object>> invalidInput(
            Exception exception,
            HttpServletRequest request
    ) {
        String message = "The request contains invalid data.";
        if (exception instanceof MethodArgumentNotValidException validation) {
            message = validation.getBindingResult().getFieldErrors().stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .findFirst()
                    .orElse(message);
        }
        return response(HttpStatus.BAD_REQUEST, message, request, null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, Object>> badRequest(
            IllegalArgumentException exception,
            HttpServletRequest request
    ) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage(), request, null);
    }

    @ExceptionHandler({
            BusinessConflictException.class,
            DataIntegrityViolationException.class,
            ObjectOptimisticLockingFailureException.class
    })
    ResponseEntity<Map<String, Object>> conflict(
            RuntimeException exception,
            HttpServletRequest request
    ) {
        if (exception instanceof BusinessConflictException conflict) {
            return response(
                    HttpStatus.CONFLICT,
                    conflict.getMessage(),
                    request,
                    null,
                    conflict.getCode(),
                    conflict.getParams());
        }
        String code = exception instanceof ObjectOptimisticLockingFailureException
                ? "CONCURRENT_MODIFICATION"
                : "DATA_INTEGRITY_CONFLICT";
        return response(
                HttpStatus.CONFLICT,
                "The requested operation conflicts with the current state.",
                request,
                null,
                code,
                Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(
            Exception exception,
            HttpServletRequest request
    ) {
        LOGGER.error("Unhandled request failure requestId={} type={}", MDC.get("requestId"), exception.getClass().getSimpleName());
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred.",
                request,
                null
        );
    }

    @ExceptionHandler({QueryTimeoutException.class, PessimisticLockingFailureException.class,
            TransactionTimedOutException.class})
    ResponseEntity<Map<String, Object>> timedOut(RuntimeException exception, HttpServletRequest request) {
        LOGGER.warn("Database operation timed out requestId={} type={}", MDC.get("requestId"), exception.getClass().getSimpleName());
        return response(HttpStatus.SERVICE_UNAVAILABLE, "The operation could not complete in time.",
                request, 3L, "OPERATION_TIMEOUT", Map.of());
    }

    private ResponseEntity<Map<String, Object>> response(
            HttpStatus status,
            String message,
            HttpServletRequest request,
            Long retryAfter
    ) {
        return response(status, message, request, retryAfter, defaultCode(status), Map.of());
    }

    private ResponseEntity<Map<String, Object>> response(
            HttpStatus status,
            String message,
            HttpServletRequest request,
            Long retryAfter,
            String code,
            Map<String, Object> params
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("code", code);
        body.put("message", message);
        body.put("params", params);
        body.put("localized", false);
        body.put("path", request.getRequestURI());
        String requestId = MDC.get("requestId");
        if (requestId != null) {
            body.put("requestId", requestId);
        }

        var builder = ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .cacheControl(CacheControl.noStore());
        if (retryAfter != null) {
            builder.header("Retry-After", Long.toString(retryAfter));
        }
        return builder.body(body);
    }

    private String defaultCode(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> "INVALID_REQUEST";
            case UNAUTHORIZED -> "UNAUTHORIZED";
            case NOT_FOUND -> "RESOURCE_NOT_FOUND";
            case TOO_MANY_REQUESTS -> "RATE_LIMITED";
            case SERVICE_UNAVAILABLE -> "EXTERNAL_SERVICE_UNAVAILABLE";
            default -> status.is5xxServerError() ? "INTERNAL_ERROR" : "REQUEST_FAILED";
        };
    }
}
