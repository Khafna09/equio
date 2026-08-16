package com.equio.backend.shared.exceptions;

public class ReportGenerationException extends RuntimeException {
    public ReportGenerationException(Throwable cause) {
        super("The report could not be generated.", cause);
    }
}
