package com.equio.backend.shared.exceptions;

import java.util.Map;

public class BusinessConflictException extends RuntimeException {
    private final String code;
    private final Map<String, Object> params;

    public BusinessConflictException(String message) {
        this("BUSINESS_CONFLICT", message, Map.of());
    }

    public BusinessConflictException(String code, String message) {
        this(code, message, Map.of());
    }

    public BusinessConflictException(String code, String message, Map<String, Object> params) {
        super(message);
        this.code = code;
        this.params = params == null ? Map.of() : Map.copyOf(params);
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
