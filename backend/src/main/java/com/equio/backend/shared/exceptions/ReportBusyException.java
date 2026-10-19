package com.equio.backend.shared.exceptions;

public class ReportBusyException extends RuntimeException {
    public ReportBusyException() {
        super("Report generation is busy. Please try again shortly.");
    }
}
