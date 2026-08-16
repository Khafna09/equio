package com.equio.backend.shared.exceptions;

public class ReportTooLargeException extends RuntimeException {
    public ReportTooLargeException(int maximumMovements) {
        super("The report exceeds the maximum of " + maximumMovements + " movements.");
    }
}
